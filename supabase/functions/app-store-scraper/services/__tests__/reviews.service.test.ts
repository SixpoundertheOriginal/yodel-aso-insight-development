import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { ReviewsService } from "../reviews.service.ts";

// Mock Supabase client for testing
const mockSupabase = {
  // Add any required supabase methods here
};

Deno.test("ReviewsService - buildRssUrl", () => {
  const reviewsService = new ReviewsService(mockSupabase);
  
  // Test basic URL building
  const url = reviewsService.buildRssUrl('us', '123456789', 1);
  const expectedUrl = 'https://itunes.apple.com/us/rss/customerreviews/page=1/id=123456789/sortby=mostrecent/json?urlDesc=/customerreviews/id=123456789/sortby=mostrecent/json';
  assertEquals(url, expectedUrl);
  
  // Test page clamping (max 10)
  const urlMax = reviewsService.buildRssUrl('us', '123456789', 15);
  const expectedUrlMax = 'https://itunes.apple.com/us/rss/customerreviews/page=10/id=123456789/sortby=mostrecent/json?urlDesc=/customerreviews/id=123456789/sortby=mostrecent/json';
  assertEquals(urlMax, expectedUrlMax);
  
  // Test page clamping (min 1)
  const urlMin = reviewsService.buildRssUrl('us', '123456789', -5);
  const expectedUrlMin = 'https://itunes.apple.com/us/rss/customerreviews/page=1/id=123456789/sortby=mostrecent/json?urlDesc=/customerreviews/id=123456789/sortby=mostrecent/json';
  assertEquals(urlMin, expectedUrlMin);
  
  // Test different country code
  const urlUK = reviewsService.buildRssUrl('gb', '123456789', 1);
  const expectedUrlUK = 'https://itunes.apple.com/gb/rss/customerreviews/page=1/id=123456789/sortby=mostrecent/json?urlDesc=/customerreviews/id=123456789/sortby=mostrecent/json';
  assertEquals(urlUK, expectedUrlUK);
});

Deno.test("ReviewsService - parseReviews", () => {
  const reviewsService = new ReviewsService(mockSupabase);
  
  // Test parsing mock iTunes RSS data
  const mockRssData = {
    feed: {
      entry: [
        // Metadata entry (should be filtered out)
        {
          id: { label: 'metadata-entry' },
          title: { label: 'Customer Reviews' },
          // No im:rating - this is metadata
        },
        // Actual review entry
        {
          id: { label: 'https://itunes.apple.com/us/review?id=123456789&type=Purple+Software' },
          title: { label: 'Great app!' },
          content: { label: 'This app is amazing and works perfectly.' },
          'im:rating': { label: '5' },
          'im:version': { label: '1.2.0' },
          author: { name: { label: 'TestUser123' } },
          updated: { label: '2024-01-15T10:30:00Z' }
        },
        // Another review
        {
          id: { label: 'https://itunes.apple.com/us/review?id=123456789&type=Purple+Software' },
          title: { label: 'Could be better' },
          content: { label: 'App crashes sometimes but overall decent.' },
          'im:rating': { label: '3' },
          'im:version': { label: '1.1.0' },
          author: { name: { label: 'AnotherUser' } },
          updated: { label: '2024-01-14T15:45:00Z' }
        }
      ]
    }
  };
  
  const reviews = reviewsService.parseReviews(mockRssData, 'us', '123456789');
  
  // Should have 2 reviews (metadata filtered out)
  assertEquals(reviews.length, 2);
  
  // Check first review
  assertEquals(reviews[0].title, 'Great app!');
  assertEquals(reviews[0].text, 'This app is amazing and works perfectly.');
  assertEquals(reviews[0].rating, 5);
  assertEquals(reviews[0].version, '1.2.0');
  assertEquals(reviews[0].author, 'TestUser123');
  assertEquals(reviews[0].updated_at, '2024-01-15T10:30:00Z');
  assertEquals(reviews[0].country, 'us');
  assertEquals(reviews[0].app_id, '123456789');
  
  // Check second review
  assertEquals(reviews[1].title, 'Could be better');
  assertEquals(reviews[1].rating, 3);
  assertEquals(reviews[1].version, '1.1.0');
  
  // Test empty data
  const emptyReviews = reviewsService.parseReviews({}, 'us', '123456789');
  assertEquals(emptyReviews.length, 0);
  
  // Test data with no reviews (only metadata)
  const metadataOnlyData = {
    feed: {
      entry: [
        {
          id: { label: 'metadata-entry' },
          title: { label: 'Customer Reviews' },
          // No im:rating
        }
      ]
    }
  };
  
  const noReviews = reviewsService.parseReviews(metadataOnlyData, 'us', '123456789');
  assertEquals(noReviews.length, 0);
});

Deno.test("ReviewsService - exportToCSV", () => {
  const reviewsService = new ReviewsService(mockSupabase);
  
  // Test CSV export with sample data
  const sampleReviews = [
    {
      review_id: '12345',
      title: 'Great app',
      text: 'Love this app, works great!',
      rating: 5,
      version: '1.0.0',
      author: 'TestUser',
      updated_at: '2024-01-15T10:30:00Z',
      country: 'us',
      app_id: '123456789'
    },
    {
      review_id: '67890',
      title: 'App with "quotes" and, commas',
      text: 'This text has\nnewlines and "quotes"',
      rating: 3,
      version: undefined,
      author: undefined,
      updated_at: undefined,
      country: 'us',
      app_id: '123456789'
    }
  ];
  
  const csv = reviewsService.exportToCSV(sampleReviews);
  
  // Check header
  assertEquals(csv.startsWith('review_id,title,text,rating,version,author,updated_at,country,app_id'), true);
  
  // Check CSV contains data
  assertEquals(csv.includes('12345'), true);
  assertEquals(csv.includes('Great app'), true);
  assertEquals(csv.includes('TestUser'), true);
  
  // Check CSV escaping for quotes and commas
  assertEquals(csv.includes('"App with ""quotes"" and, commas"'), true);
  
  // Check undefined values become "—"
  assertEquals(csv.includes('—'), true);
  
  // Test empty array
  const emptyCsv = reviewsService.exportToCSV([]);
  assertEquals(emptyCsv, 'review_id,title,text,rating,version,author,updated_at,country,app_id\n');
  
  // Test newline character is "\n" (not literal newline)
  assertEquals(csv.includes('\n'), true);
  assertEquals(csv.endsWith('\n'), true);
});

Deno.test("ReviewsService - CSV newline format", () => {
  const reviewsService = new ReviewsService(mockSupabase);
  
  const sampleReviews = [
    {
      review_id: '12345',
      title: 'Test',
      text: 'Test review',
      rating: 5,
      version: '1.0.0',
      author: 'User',
      updated_at: '2024-01-15',
      country: 'us',
      app_id: '123456789'
    }
  ];
  
  const csv = reviewsService.exportToCSV(sampleReviews);
  
  // Verify newline is "\n" character (ASCII 10), not literal text
  const lines = csv.split('\n');
  assertEquals(lines.length, 3); // header + data + final newline = 3 elements
  assertEquals(lines[2], ''); // Final element should be empty (trailing newline)
  
  // Ensure no literal "\n" text appears
  assertEquals(csv.includes('\\n'), false);
});