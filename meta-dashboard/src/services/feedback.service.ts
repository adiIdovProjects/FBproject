import { apiClient } from './apiClient';

export interface FeedbackSubmission {
  feedback_type: 'bug' | 'feature_request' | 'improvement' | 'other';
  title: string;
  message: string;
  rating?: number;
}

export interface FeedbackItem {
  id: number;
  feedback_type: string;
  title: string;
  message: string;
  rating: number | null;
  status: string;
  created_at: string;
}

export async function submitFeedback(data: FeedbackSubmission): Promise<{ id: number; status: string; message: string }> {
  try {
    const response = await apiClient.post('/api/v1/feedback/', data);
    return response.data;
  } catch (error) {
    console.error('[Feedback Service] Error submitting feedback:', error);
    throw error;
  }
}

export async function getMyFeedback(): Promise<FeedbackItem[]> {
  try {
    const response = await apiClient.get('/api/v1/feedback/mine');
    return response.data;
  } catch (error) {
    console.error('[Feedback Service] Error fetching feedback:', error);
    throw error;
  }
}
