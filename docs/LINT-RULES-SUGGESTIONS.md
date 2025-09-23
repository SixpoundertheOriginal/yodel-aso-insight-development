# ESLint Rules - Reviews System Protection

If your project uses ESLint, add these rules to prevent accidental reversion to broken iTunes RSS approaches:

## .eslintrc.js Configuration

```javascript
module.exports = {
  // ... existing config ...
  
  rules: {
    // ... existing rules ...
    
    // Prevent imports of deleted iTunes RSS service
    "no-restricted-imports": [
      "error", 
      {
        "paths": [
          {
            "name": "@/services/iTunesReviewsService",
            "message": "iTunes RSS API is broken. Use fetchAppReviews() from @/utils/itunesReviews instead. See docs/ADR-reviews-system.md"
          },
          {
            "name": "./services/iTunesReviewsService",
            "message": "iTunes RSS API is broken. Use fetchAppReviews() from @/utils/itunesReviews instead. See docs/ADR-reviews-system.md"  
          },
          {
            "name": "../services/iTunesReviewsService", 
            "message": "iTunes RSS API is broken. Use fetchAppReviews() from @/utils/itunesReviews instead. See docs/ADR-reviews-system.md"
          }
        ],
        "patterns": [
          {
            "group": ["**/iTunesReviewsService*"],
            "message": "iTunes RSS API is broken. Use fetchAppReviews() from @/utils/itunesReviews instead. See docs/ADR-reviews-system.md"
          }
        ]
      }
    ]
  }
}
```

## Custom ESLint Rule (Advanced)

For more sophisticated protection, create a custom rule:

```javascript
// .eslintrc.js
module.exports = {
  // ... existing config ...
  
  rules: {
    // Custom rule to detect dangerous iTunes RSS patterns
    "reviews-system/no-direct-itunes-rss": "error"
  },
  
  // Add custom rule definition
  plugins: ["reviews-system"]
}

// eslint-plugin-reviews-system/index.js
module.exports = {
  rules: {
    "no-direct-itunes-rss": {
      meta: {
        type: "problem",
        docs: {
          description: "Prevent direct iTunes RSS API calls",
          category: "Best Practices"
        },
        messages: {
          noDirectItunesRss: "Direct iTunes RSS calls are broken. Use fetchReviewsViaEdgeFunction() instead."
        }
      },
      
      create(context) {
        return {
          // Detect iTunes RSS URL patterns
          Literal(node) {
            if (typeof node.value === 'string' && 
                node.value.includes('itunes.apple.com/us/rss/customerreviews')) {
              context.report({
                node,
                messageId: "noDirectItunesRss"
              });
            }
          },
          
          // Detect iTunesReviewsService imports
          ImportDeclaration(node) {
            if (node.source.value && 
                node.source.value.includes('iTunesReviewsService')) {
              context.report({
                node,
                messageId: "noDirectItunesRss"
              });
            }
          }
        }
      }
    }
  }
}
```

## TypeScript ESLint Integration

For TypeScript projects, add type-aware rules:

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    // ... other extends
  ],
  
  rules: {
    // Prevent usage of deprecated types
    "@typescript-eslint/no-deprecated": "error",
    
    // Custom restriction for reviews system
    "no-restricted-imports": [
      "error",
      {
        "paths": [
          {
            "name": "@/services/iTunesReviewsService",
            "importNames": ["ITunesReviewsService", "default"],
            "message": "This service was deleted. Use fetchAppReviews() instead."
          }
        ]
      }
    ]
  }
}
```

## VS Code Integration

Add to `.vscode/settings.json`:

```json
{
  "eslint.validate": [
    "javascript",
    "typescript",
    "javascriptreact", 
    "typescriptreact"
  ],
  
  "eslint.workingDirectories": [
    "src"
  ],
  
  // Show lint errors prominently
  "problems.decorations.enabled": true
}
```

## Implementation Notes

1. **Gradual Adoption**: Start with `no-restricted-imports` - it's simple and effective
2. **Team Education**: The error messages should point to documentation
3. **CI Integration**: Ensure lint rules run in continuous integration
4. **IDE Integration**: Configure editors to show lint errors in real-time

## Testing Lint Rules

```javascript
// test/fixtures/bad-imports.js - Should trigger lint errors
import { ITunesReviewsService } from '@/services/iTunesReviewsService'; // ❌ Should error

// test/fixtures/good-imports.js - Should pass
import { fetchAppReviews } from '@/utils/itunesReviews'; // ✅ Should pass
```

Run tests:
```bash
npx eslint test/fixtures/bad-imports.js  # Should show errors
npx eslint test/fixtures/good-imports.js # Should pass
```

## Benefits

- **Prevent Regressions**: Stop accidental imports of broken services
- **Clear Error Messages**: Guide developers to correct approach
- **Team Consistency**: Enforce architectural decisions across all developers
- **CI Protection**: Catch issues before they reach production
- **Documentation Integration**: Error messages link to architectural docs
