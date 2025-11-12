export interface GooglePlayReview {
  review_id: string;
  app_id: string;            // Package ID (e.g., "com.whatsapp")
  platform: 'android';
  country: string;
  title: string;
  text: string;
  rating: number;            // 1-5
  version: string;           // App version
  author: string;
  review_date: string;       // ISO timestamp

  // Google Play specific
  developer_reply?: string;
  developer_reply_date?: string;
  thumbs_up_count: number;
  reviewer_language?: string;
}

export interface ReviewsServiceOptions {
  packageId: string;
  country: string;
  lang: string;
  page: number;
  pageSize: number;
  sort: 'newest' | 'rating' | 'helpfulness';
  paginationToken?: string;
}

export interface ReviewsResponse {
  success: boolean;
  data?: GooglePlayReview[];
  error?: string;
  totalReviews?: number;
  currentPage: number;
  hasMore: boolean;
  nextPaginationToken?: string;
}

export interface GooglePlayApp {
  app_name: string;
  app_id: string;            // Package ID
  platform: 'android';
  bundle_id: string;         // Same as app_id for Android
  developer_name: string;
  app_icon_url: string;
  app_rating: number;
  category: string;
  installs: string;          // e.g., "10,000,000+"
  price: string;             // "Free" or "$4.99"
}
