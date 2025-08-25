import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export interface AIQuery {
  id?: string;
  userId: string;
  query: string;
  context?: any;
  response?: string;
  modelUsed?: string;
  tokensUsed?: number;
  processingTimeMs?: number;
  sessionId?: string;
}

export interface AIInsight {
  type: 'attendance' | 'performance' | 'engagement' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  actionUrl?: string;
  metadata?: any;
}

export interface AITutorResponse {
  response: string;
  suggestions: string[];
  relatedTopics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export class AIService {
  private static instance: AIService;
  private apiKey: string;

  private constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Store AI interaction in database
   */
  async logInteraction(interaction: AIQuery): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_interactions')
        .insert({
          user_id: interaction.userId,
          session_id: interaction.sessionId,
          query: interaction.query,
          response: interaction.response,
          context: interaction.context,
          model_used: interaction.modelUsed,
          tokens_used: interaction.tokensUsed,
          processing_time_ms: interaction.processingTimeMs
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging AI interaction:', error);
    }
  }

  /**
   * Generate AI insights for student performance
   */
  async generateStudentInsights(studentId: string, sectionId: string): Promise<AIInsight[]> {
    try {
      // Fetch student data for analysis
      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('section_id', sectionId);

      const { data: assignments } = await supabase
        .from('assignment_submissions')
        .select(`
          *,
          assignments (
            title,
            max_points,
            weight
          )
        `)
        .eq('student_id', studentId);

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', studentId)
        .eq('section_id', sectionId)
        .single();

      // Analyze attendance patterns
      const attendanceInsights = this.analyzeAttendance(attendance || []);
      
      // Analyze performance trends
      const performanceInsights = this.analyzePerformance(assignments || []);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(
        attendanceInsights,
        performanceInsights,
        enrollments
      );

      return [...attendanceInsights, ...performanceInsights, ...recommendations];
    } catch (error) {
      console.error('Error generating student insights:', error);
      return [];
    }
  }

  /**
   * Analyze attendance patterns
   */
  private analyzeAttendance(attendance: any[]): AIInsight[] {
    if (attendance.length === 0) return [];

    const insights: AIInsight[] = [];
    const totalSessions = attendance.length;
    const presentSessions = attendance.filter(a => a.status === 'present').length;
    const attendanceRate = (presentSessions / totalSessions) * 100;

    if (attendanceRate < 80) {
      insights.push({
        type: 'attendance',
        title: 'Low Attendance Alert',
        description: `Your attendance rate is ${attendanceRate.toFixed(1)}%, which is below the recommended 80%. Consider improving your attendance to maintain academic progress.`,
        confidence: 0.9,
        actionable: true,
        actionUrl: '/attendance',
        metadata: { attendanceRate, totalSessions, presentSessions }
      });
    }

    // Check for patterns
    const recentAbsences = attendance
      .filter(a => a.status === 'absent' && new Date(a.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .length;

    if (recentAbsences > 2) {
      insights.push({
        type: 'attendance',
        title: 'Recent Absence Pattern',
        description: `You've been absent ${recentAbsences} times in the last week. This could impact your learning and grades.`,
        confidence: 0.8,
        actionable: true,
        actionUrl: '/attendance',
        metadata: { recentAbsences }
      });
    }

    return insights;
  }

  /**
   * Analyze assignment performance
   */
  private analyzePerformance(assignments: any[]): AIInsight[] {
    if (assignments.length === 0) return [];

    const insights: AIInsight[] = [];
    const gradedAssignments = assignments.filter(a => a.grade !== null);
    
    if (gradedAssignments.length === 0) return insights;

    const averageGrade = gradedAssignments.reduce((sum, a) => sum + (a.grade || 0), 0) / gradedAssignments.length;
    const maxPoints = gradedAssignments.reduce((sum, a) => sum + (a.assignments?.max_points || 100), 0);
    const earnedPoints = gradedAssignments.reduce((sum, a) => sum + (a.grade || 0), 0);
    const overallPercentage = (earnedPoints / maxPoints) * 100;

    if (overallPercentage < 70) {
      insights.push({
        type: 'performance',
        title: 'Performance Improvement Needed',
        description: `Your current performance is ${overallPercentage.toFixed(1)}%. Consider seeking help from your instructor or utilizing available resources.`,
        confidence: 0.85,
        actionable: true,
        actionUrl: '/assignments',
        metadata: { overallPercentage, averageGrade, totalAssignments: gradedAssignments.length }
      });
    }

    // Check for improvement trends
    const sortedAssignments = gradedAssignments.sort((a, b) => 
      new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );

    if (sortedAssignments.length >= 2) {
      const firstHalf = sortedAssignments.slice(0, Math.ceil(sortedAssignments.length / 2));
      const secondHalf = sortedAssignments.slice(Math.ceil(sortedAssignments.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, a) => sum + (a.grade || 0), 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, a) => sum + (a.grade || 0), 0) / secondHalf.length;

      if (secondHalfAvg > firstHalfAvg + 10) {
        insights.push({
          type: 'performance',
          title: 'Great Improvement!',
          description: 'Your performance has shown significant improvement. Keep up the excellent work!',
          confidence: 0.9,
          actionable: false,
          metadata: { improvement: secondHalfAvg - firstHalfAvg }
        });
      }
    }

    return insights;
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(
    attendanceInsights: AIInsight[],
    performanceInsights: AIInsight[],
    enrollment: any
  ): AIInsight[] {
    const recommendations: AIInsight[] = [];

    // Attendance-based recommendations
    if (attendanceInsights.some(i => i.type === 'attendance')) {
      recommendations.push({
        type: 'recommendation',
        title: 'Attendance Improvement Plan',
        description: 'Set daily reminders, establish a routine, and communicate with your instructor about any challenges.',
        confidence: 0.8,
        actionable: true,
        actionUrl: '/settings',
        metadata: { category: 'attendance' }
      });
    }

    // Performance-based recommendations
    if (performanceInsights.some(i => i.type === 'performance')) {
      recommendations.push({
        type: 'recommendation',
        title: 'Academic Support Resources',
        description: 'Consider utilizing office hours, study groups, or tutoring services to improve your performance.',
        confidence: 0.85,
        actionable: true,
        actionUrl: '/resources',
        metadata: { category: 'academic_support' }
      });
    }

    // General engagement recommendations
    recommendations.push({
      type: 'recommendation',
      title: 'Stay Engaged',
      description: 'Participate actively in class discussions, ask questions, and connect with your peers.',
      confidence: 0.7,
      actionable: true,
      actionUrl: '/courses',
      metadata: { category: 'engagement' }
    });

    return recommendations;
  }

  /**
   * AI-powered tutoring assistance
   */
  async getTutorResponse(
    query: string,
    context: {
      subject: string;
      difficulty: string;
      userId: string;
      sessionId?: string;
    }
  ): Promise<AITutorResponse> {
    try {
      // Log the interaction
      await this.logInteraction({
        userId: context.userId,
        query,
        context,
        sessionId: context.sessionId
      });

      // For now, return a structured response
      // In production, this would integrate with OpenAI, Anthropic, or similar
      const response = this.generateTutorResponse(query, context);
      
      return response;
    } catch (error) {
      console.error('Error getting tutor response:', error);
      return {
        response: 'I apologize, but I\'m having trouble processing your request right now. Please try again later.',
        suggestions: ['Check your internet connection', 'Try rephrasing your question'],
        relatedTopics: [],
        difficulty: 'beginner'
      };
    }
  }

  /**
   * Generate tutor response (placeholder for AI integration)
   */
  private generateTutorResponse(query: string, context: any): AITutorResponse {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('attendance') || lowerQuery.includes('absent')) {
      return {
        response: 'Attendance is crucial for academic success. Regular attendance helps you stay engaged with the material and maintain good standing in your courses.',
        suggestions: [
          'Set daily reminders on your phone',
          'Establish a morning routine',
          'Communicate with instructors about challenges'
        ],
        relatedTopics: ['Time Management', 'Study Habits', 'Academic Policies'],
        difficulty: 'beginner'
      };
    }

    if (lowerQuery.includes('grade') || lowerQuery.includes('performance')) {
      return {
        response: 'Improving your grades involves consistent effort, effective study strategies, and seeking help when needed.',
        suggestions: [
          'Attend office hours regularly',
          'Form study groups with classmates',
          'Review material daily instead of cramming'
        ],
        relatedTopics: ['Study Strategies', 'Test Preparation', 'Academic Support'],
        difficulty: 'intermediate'
      };
    }

    // Default response
    return {
      response: 'I\'m here to help with your academic questions. Feel free to ask about attendance, grades, study strategies, or any other academic topics.',
      suggestions: [
        'Ask specific questions for better assistance',
        'Provide context about your situation',
        'Check the course syllabus for policies'
      ],
      relatedTopics: ['Academic Policies', 'Study Resources', 'Course Information'],
      difficulty: 'beginner'
    };
  }

  /**
   * Generate course recommendations based on student profile
   */
  async generateCourseRecommendations(userId: string): Promise<any[]> {
    try {
      // Fetch user profile and academic history
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          *,
          course_sections (
            courses (
              title,
              description,
              credits,
              department_id
            )
          )
        `)
        .eq('student_id', profile?.id);

      // Simple recommendation logic (can be enhanced with ML)
      const { data: availableCourses } = await supabase
        .from('courses')
        .select('*')
        .not('id', 'in', `(${enrollments?.map(e => e.course_sections?.courses?.id).filter(Boolean).join(',')})`);

      return availableCourses?.slice(0, 5) || [];
    } catch (error) {
      console.error('Error generating course recommendations:', error);
      return [];
    }
  }

  /**
   * Analyze class performance trends
   */
  async analyzeClassPerformance(sectionId: string): Promise<any> {
    try {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          *,
          assignment_submissions (
            grade,
            assignments (
              max_points,
              weight
            )
          )
        `)
        .eq('section_id', sectionId);

      if (!enrollments || enrollments.length === 0) return null;

      const analysis = {
        totalStudents: enrollments.length,
        averageGrade: 0,
        gradeDistribution: {
          A: 0, B: 0, C: 0, D: 0, F: 0
        },
        topPerformers: [],
        strugglingStudents: []
      };

      // Calculate statistics
      let totalGrade = 0;
      let totalSubmissions = 0;

      enrollments.forEach(enrollment => {
        if (enrollment.assignment_submissions) {
          enrollment.assignment_submissions.forEach(submission => {
            if (submission.grade) {
              const percentage = (submission.grade / submission.assignments.max_points) * 100;
              totalGrade += percentage;
              totalSubmissions++;

              // Grade distribution
              if (percentage >= 90) analysis.gradeDistribution.A++;
              else if (percentage >= 80) analysis.gradeDistribution.B++;
              else if (percentage >= 70) analysis.gradeDistribution.C++;
              else if (percentage >= 60) analysis.gradeDistribution.D++;
              else analysis.gradeDistribution.F++;
            }
          });
        }
      });

      analysis.averageGrade = totalSubmissions > 0 ? totalGrade / totalSubmissions : 0;

      return analysis;
    } catch (error) {
      console.error('Error analyzing class performance:', error);
      return null;
    }
  }
}

export const aiService = AIService.getInstance();