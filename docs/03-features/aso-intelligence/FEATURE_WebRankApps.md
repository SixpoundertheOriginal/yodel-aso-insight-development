# Web Rank Apps - SERP Ranking Tool

A feature within the ASO Tool platform for checking App Store URL rankings in Google search results by keyword.

## Overview
This tool allows users to analyze how well their app store pages rank in Google's search results for specific keywords, providing valuable SEO insights for app visibility.

## Access & Route
- **Route**: `/growth/web-rank-apps`
- **Navigation**: Growth Accelerators → Web Rank Apps
- **Permissions**: Available to ASO Managers and above

## Configuration
The feature requires external SERP API configuration:
- **Environment Variable**: `VITE_SERP_API_BASE`
- **Default Fallback**: `http://localhost:8787`
- **Status Indicator**: Shows warning if API is unreachable

## API Integration
- **Method**: POST to `${VITE_SERP_API_BASE}/rank`
- **Request Body**:
  ```json
  {
    "appUrl": "string",
    "keyword": "string", 
    "gl": "string",
    "hl": "string"
  }
  ```
- **Response Format**:
  ```json
  {
    "appUrl": "string",
    "keyword": "string",
    "gl": "string", 
    "hl": "string",
    "rank": "number | null",
    "matchedUrl": "string (optional)"
  }
  ```

## User Workflow
1. **Input Configuration**:
   - Enter App Store URL (pre-filled with TUI DK example)
   - Specify target keyword for ranking check
   
2. **Market Selection**:
   - Choose country code (`gl`) - default: `dk` (Denmark)
   - Select language (`hl`) - default: `da` (Danish)
   
3. **Execute Scan**:
   - Click "Run Scan" to initiate ranking check
   - 10-second timeout prevents hanging requests
   
4. **Review Results**:
   - Displays rank position (1-100) or "Not found in top 100"
   - Shows matched URL if found (clickable link)
   - Error states handled gracefully with user feedback

## Technical Implementation
- **Validation**: Uses Zod schemas for response validation
- **Error Handling**: Comprehensive error states with console logging
- **UI/UX**: Loading states and timeout handling
- **Responsive Design**: Mobile-friendly interface

## Integration Notes
- Part of the broader Growth Accelerators suite
- Complements other SEO and ASO analysis tools
- Data can be exported for reporting purposes
- Results may be cached for performance optimization

## Future Enhancements
- Historical rank tracking
- Bulk keyword analysis
- Competitive ranking comparison
- Integration with BigQuery for trend analysis

## Related Features
- **Review Management**: App store review analysis
- **Creative Analysis**: Screenshot and metadata optimization
- **Keyword Discovery**: Competitive keyword research
- **Metadata Copilot**: AI-powered ASO recommendations
