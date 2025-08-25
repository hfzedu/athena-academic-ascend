import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  actionUrl?: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  type: Notification['type'];
  variables: string[];
}

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Create a new notification
   */
  async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Notification | null> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          is_read: notification.isRead,
          action_url: notification.actionUrl,
          metadata: notification.metadata
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return [];
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Create system notifications for various events
   */
  async createSystemNotification(
    userId: string,
    template: string,
    variables: Record<string, any> = {},
    actionUrl?: string
  ): Promise<Notification | null> {
    const templates: Record<string, NotificationTemplate> = {
      'assignment_due_soon': {
        id: 'assignment_due_soon',
        name: 'Assignment Due Soon',
        title: 'Assignment Due Soon',
        message: 'Your assignment "{assignment_name}" is due in {time_remaining}.',
        type: 'warning',
        variables: ['assignment_name', 'time_remaining']
      },
      'assignment_graded': {
        id: 'assignment_graded',
        name: 'Assignment Graded',
        title: 'Assignment Graded',
        message: 'Your assignment "{assignment_name}" has been graded. You received {grade}/{max_points}.',
        type: 'info',
        variables: ['assignment_name', 'grade', 'max_points']
      },
      'attendance_warning': {
        id: 'attendance_warning',
        name: 'Attendance Warning',
        title: 'Attendance Warning',
        message: 'Your attendance in {course_name} is below the required threshold. Current rate: {attendance_rate}%.',
        type: 'warning',
        variables: ['course_name', 'attendance_rate']
      },
      'course_enrollment': {
        id: 'course_enrollment',
        name: 'Course Enrollment',
        title: 'Course Enrollment Confirmed',
        message: 'You have been successfully enrolled in {course_name} ({section_number}).',
        type: 'success',
        variables: ['course_name', 'section_number']
      },
      'course_dropped': {
        id: 'course_dropped',
        name: 'Course Dropped',
        title: 'Course Dropped',
        message: 'You have been dropped from {course_name} ({section_number}).',
        type: 'info',
        variables: ['course_name', 'section_number']
      },
      'announcement': {
        id: 'announcement',
        name: 'New Announcement',
        title: 'New Announcement',
        message: 'New announcement in {course_name}: {announcement_title}',
        type: 'info',
        variables: ['course_name', 'announcement_title']
      },
      'grade_update': {
        id: 'grade_update',
        name: 'Grade Update',
        title: 'Grade Update',
        message: 'Your grade in {course_name} has been updated to {new_grade}.',
        type: 'info',
        variables: ['course_name', 'new_grade']
      }
    };

    const templateData = templates[template];
    if (!templateData) {
      console.error(`Unknown notification template: ${template}`);
      return null;
    }

    let message = templateData.message;
    templateData.variables.forEach(variable => {
      const value = variables[variable];
      if (value !== undefined) {
        message = message.replace(`{${variable}}`, value.toString());
      }
    });

    return this.createNotification({
      userId,
      title: templateData.title,
      message,
      type: templateData.type,
      isRead: false,
      actionUrl,
      metadata: { template, variables }
    });
  }

  /**
   * Create bulk notifications for multiple users
   */
  async createBulkNotifications(
    userIds: string[],
    template: string,
    variables: Record<string, any> = {},
    actionUrl?: string
  ): Promise<number> {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title: this.getTemplateTitle(template),
        message: this.getTemplateMessage(template, variables),
        type: this.getTemplateType(template),
        is_read: false,
        action_url: actionUrl,
        metadata: { template, variables }
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;
      return notifications.length;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      return 0;
    }
  }

  /**
   * Get notification preferences for a user
   */
  async getUserPreferences(userId: string): Promise<any> {
    try {
      // This would typically come from a user_preferences table
      // For now, return default preferences
      return {
        email: true,
        push: true,
        sms: false,
        types: {
          assignments: true,
          attendance: true,
          grades: true,
          announcements: true,
          system: true
        }
      };
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }
  }

  /**
   * Update notification preferences
   */
  async updateUserPreferences(userId: string, preferences: any): Promise<boolean> {
    try {
      // This would typically update a user_preferences table
      // For now, just return success
      console.log('Updating preferences for user:', userId, preferences);
      return true;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return false;
    }
  }

  /**
   * Helper methods for templates
   */
  private getTemplateTitle(template: string): string {
    const titles: Record<string, string> = {
      'assignment_due_soon': 'Assignment Due Soon',
      'assignment_graded': 'Assignment Graded',
      'attendance_warning': 'Attendance Warning',
      'course_enrollment': 'Course Enrollment Confirmed',
      'course_dropped': 'Course Dropped',
      'announcement': 'New Announcement',
      'grade_update': 'Grade Update'
    };
    return titles[template] || 'Notification';
  }

  private getTemplateMessage(template: string, variables: Record<string, any>): string {
    const messages: Record<string, string> = {
      'assignment_due_soon': `Your assignment "${variables.assignment_name || 'Unknown'}" is due in ${variables.time_remaining || 'soon'}.`,
      'assignment_graded': `Your assignment "${variables.assignment_name || 'Unknown'}" has been graded. You received ${variables.grade || 'N/A'}/${variables.max_points || 'N/A'}.`,
      'attendance_warning': `Your attendance in ${variables.course_name || 'Unknown Course'} is below the required threshold. Current rate: ${variables.attendance_rate || 'N/A'}%.`,
      'course_enrollment': `You have been successfully enrolled in ${variables.course_name || 'Unknown Course'} (${variables.section_number || 'N/A'}).`,
      'course_dropped': `You have been dropped from ${variables.course_name || 'Unknown Course'} (${variables.section_number || 'N/A'}).`,
      'announcement': `New announcement in ${variables.course_name || 'Unknown Course'}: ${variables.announcement_title || 'No title'}`,
      'grade_update': `Your grade in ${variables.course_name || 'Unknown Course'} has been updated to ${variables.new_grade || 'N/A'}.`
    };
    return messages[template] || 'You have a new notification.';
  }

  private getTemplateType(template: string): Notification['type'] {
    const types: Record<string, Notification['type']> = {
      'assignment_due_soon': 'warning',
      'assignment_graded': 'info',
      'attendance_warning': 'warning',
      'course_enrollment': 'success',
      'course_dropped': 'info',
      'announcement': 'info',
      'grade_update': 'info'
    };
    return types[template] || 'info';
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { error } = await supabase
        .from('notifications')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;
      return 1; // Return success
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      return 0;
    }
  }
}

export const notificationService = NotificationService.getInstance();