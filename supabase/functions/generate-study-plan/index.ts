import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { OpenAI } from "https://esm.sh/openai@4.33.0";
import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
if (!OPENAI_API_KEY) {
  console.error("FATAL: OPENAI_API_KEY environment variable not set.");
}
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface EnrolledCourseInfo {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  credits: number;
}

interface UpcomingAssignmentInfo {
  id: string;
  title: string;
  due_date: string;
  course_code: string;
  course_name: string;
  description?: string | null;
}

interface StudentPreferences {
  preferred_study_times?: string[];
  study_session_length_minutes?: number;
  breaks_every_minutes?: number;
  learning_style_notes?: string;
}

interface StudyTask {
  id: string;
  task: string;
  course_code: string;
  course_name: string;
  due_date?: string;
  estimated_time_minutes?: number;
  priority?: 'high' | 'medium' | 'low';
  completed: boolean;
  type: 'reading' | 'practice' | 'review' | 'assignment_work' | 'project_work' | 'quiz_prep' | 'exam_prep';
}

interface DailyStudySchedule {
  [date: string]: StudyTask[];
}

interface GeneratedStudyPlan {
  id: string;
  student_id: string;
  term_id: string;
  generated_at: string;
  plan_title: string;
  overall_goals?: string[];
  weekly_focus_themes?: Record<string, string>;
  daily_schedule?: DailyStudySchedule;
  resource_suggestions?: string[];
  general_tips?: string[];
}

const getUserSupabaseClient = (req: Request): SupabaseClient => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error("Missing Authorization header. User must be authenticated.");
  }
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabaseClient: SupabaseClient;
  let studentIdFromAuth: string | undefined;

  try {
    supabaseClient = getUserSupabaseClient(req);
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not authenticated.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    studentIdFromAuth = user.id;
  } catch (authError) {
    console.error("Auth error in Edge Function:", authError);
    return new Response(JSON.stringify({ error: (authError as Error).message || 'Authentication failed.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let studentId: string;
  let termId: string;

  try {
    const body = await req.json();
    studentId = body.studentId;
    termId = body.termId;

    if (!studentId || !termId) {
      return new Response(JSON.stringify({ error: 'studentId and termId are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (studentIdFromAuth !== studentId) {
      return new Response(JSON.stringify({ error: 'Unauthorized to generate plan for this student.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (parseError) {
    return new Response(JSON.stringify({ error: 'Invalid JSON request body.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { data: enrollments, error: enrollmentsError } = await supabaseClient
      .from('enrollments')
      .select(`
        section:section_id!inner(
          id,
          course:course_id!inner(id, name, code, description, credits),
          term_id
        )
      `)
      .eq('student_profile_id', studentId)
      .eq('section.term_id', termId)
      .in('status', ['enrolled']);

    if (enrollmentsError) throw enrollmentsError;
    if (!enrollments || enrollments.length === 0) {
      return new Response(JSON.stringify({ error: 'No enrolled courses found for this student in the specified term to generate a plan.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const courses: EnrolledCourseInfo[] = enrollments.map((e: any) => e.section.course).filter(Boolean);

    const courseIds = courses.map(c => c.id);
    const todayISO = new Date().toISOString().split('T')[0];

    const { data: assignments, error: assignmentsError } = await supabaseClient
      .from('assignments')
      .select(`
        id, title, due_date, description,
        course:course_id!inner(code, name)
      `)
      .in('course_id', courseIds)
      .gte('due_date', todayISO)
      .order('due_date', { ascending: true });

    if (assignmentsError) throw assignmentsError;

    const upcomingAssignments: UpcomingAssignmentInfo[] = (assignments || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      due_date: a.due_date,
      course_code: a.course.code,
      course_name: a.course.name,
      description: a.description,
    }));

    const preferences: StudentPreferences = {
      preferred_study_times: ["morning", "afternoon"],
      study_session_length_minutes: 60,
      breaks_every_minutes: 15,
      learning_style_notes: "Prefers breaking down tasks into smaller chunks.",
    };

    let prompt = `You are an expert academic advisor and study planner AI.
A student needs a personalized study plan for the current term.
Student ID: ${studentId}
Term ID: ${termId}

Enrolled Courses:
${courses.map(c => `- ${c.code} - ${c.name} (${c.credits} credits): ${c.description || 'No description provided.'}`).join('\n')}

Upcoming Assignments (sorted by due date):
${upcomingAssignments.length > 0 ? upcomingAssignments.map(a => `- ${a.title} for ${a.course_code} (Due: ${new Date(a.due_date).toLocaleDateString()})${a.description ? ': ' + a.description.substring(0,100)+'...' : ''}`).join('\n') : 'No upcoming assignments found.'}

Student's Study Preferences (if any):
${Object.entries(preferences).length > 0 ? Object.entries(preferences).map(([key, value]) => `- ${key.replace(/_/g, ' ')}: ${Array.isArray(value) ? value.join(', ') : value}`).join('\n') : 'No specific preferences provided.'}

Today's Date: ${new Date().toLocaleDateString()}

Based on this information, generate a structured, actionable study plan for the next 2-4 weeks.
The plan should help the student manage their workload, prepare for assignments, and learn the course material effectively.
Consider breaking down larger tasks. Prioritize tasks based on due dates and importance.
Suggest estimated times for tasks where appropriate.
Include some general study tips relevant to their course load or preferences.

Please provide the output STRICTLY in the following JSON format, with no explanations or text outside the JSON structure:
{\n  "id": "generate_a_uuid_v4_for_this_plan",\n  "student_id": "${studentId}",\n  "term_id": "${termId}",\n  "generated_at": "current_iso_timestamp",\n  "plan_title": "Term ${termId} Study Plan for Student ${studentId}",\n  "overall_goals": ["string - 1-3 high-level goals for the student for this period"],\n  "weekly_focus_themes": {\n    "Week 1 (YYYY-MM-DD to YYYY-MM-DD)": "string - main focus for this week",\n    "Week 2 (YYYY-MM-DD to YYYY-MM-DD)": "string - main focus for this week"\n  },\n  "daily_schedule": {\n    "YYYY-MM-DD": [\n      {\n        "id": "task_uuid_or_assignment_id_if_direct",\n        "task": "Specific study action",\n        "course_code": "COURSE_CODE",\n        "course_name": "Course Name",\n        "due_date": "YYYY-MM-DD or null",\n        "estimated_time_minutes": number_or_null,\n        "priority": "'high' | 'medium' | 'low'",\n        "completed": false,\n        "type": "'reading' | 'practice' | 'review' | 'assignment_work' | 'project_work' | 'quiz_prep' | 'exam_prep'"\n      }\n    ]\n  },\n  "resource_suggestions": ["string - e.g., specific online resources, textbook chapters"],\n  "general_tips": ["string - general study advice"]\n}

Ensure all dates are in YYYY-MM-DD format. For daily_schedule, provide tasks for at least the next 7-14 days.
If there are many assignments, focus on the most immediate ones for the daily schedule.
The 'id' for tasks within daily_schedule can be a newly generated UUID or the assignment's ID if the task is directly working on that assignment.
The 'id' for the overall plan should be a new UUID v4.
'generated_at' should be the current ISO timestamp.`;

    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API Key is not configured for the Edge Function.");
    }

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 3000,
    });

    const llmResponseContent = chatCompletion.choices[0]?.message?.content;
    if (!llmResponseContent) {
      throw new Error('LLM did not return a response.');
    }

    let generatedPlan: GeneratedStudyPlan;
    try {
      generatedPlan = JSON.parse(llmResponseContent);
      if (!generatedPlan.id || !generatedPlan.daily_schedule) {
        throw new Error("LLM response is not in the expected JSON format or is missing key fields.");
      }
      if (!generatedPlan.generated_at || generatedPlan.generated_at === "current_iso_timestamp") {
        generatedPlan.generated_at = new Date().toISOString();
      }
      if (generatedPlan.id === "generate_a_uuid_v4_for_this_plan") {
        generatedPlan.id = crypto.randomUUID();
      }
    } catch (parseError) {
      console.error("Error parsing LLM JSON response:", parseError);
      console.error("LLM Raw Response:", llmResponseContent);
      throw new Error(`Failed to parse study plan from AI: ${(parseError as Error).message}. LLM response might not be valid JSON.`);
    }

    return new Response(JSON.stringify({ plan: generatedPlan }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in generate-study-plan function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

