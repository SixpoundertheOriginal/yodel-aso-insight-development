import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AppStoreIntegrationService } from '@/services/appstore-integration.service';
import { 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Star, 
  Download,
  Loader2,
  ExternalLink,
  Info
} from 'lucide-react';

interface AppStoreSearchResult {
  name: string;
  appId: string;
  title: string;
  subtitle?: string;
  description?: string;
  url: string;
  icon?: string;
  rating?: number;
  reviews?: number;
  developer?: string;
  applicationCategory?: string;
  locale: string;
}

interface ValidatedApp {
  appId: string;
  metadata: AppStoreSearchResult;
  isValid: boolean;
}

interface AppValidationFormProps {
  onAppValidated: (validatedApp: ValidatedApp) => void;
  organizationId: string;
}

export const AppValidationForm: React.FC<AppValidationFormProps> = ({
  onAppValidated,
  organizationId
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AppStoreSearchResult[]>([]);
  const [selectedApp, setSelectedApp] = useState<AppStoreSearchResult | null>(null);
  const [validationStep, setValidationStep] = useState<'search' | 'results' | 'confirmed'>('search');

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: 'Search Required',
        description: 'Please enter an app name or App Store ID to search.',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    setValidationStep('search');

    try {
      console.log('🔍 Searching for app:', searchTerm);
      const response = await AppStoreIntegrationService.searchApp(searchTerm, organizationId);

      if (!response.success || !response.data) {
        toast({
          title: 'Search Failed',
          description: response.error || 'Failed to find app in the App Store',
          variant: 'destructive',
        });
        return;
      }

      console.log('✅ Search results:', response.data);
      setSearchResults(response.data);
      setValidationStep('results');

      if (response.data.length === 1) {
        // Auto-select if only one result
        setSelectedApp(response.data[0]);
        setValidationStep('confirmed');
      }

    } catch (error: any) {
      console.error('💥 Search error:', error);
      toast({
        title: 'Search Error',
        description: 'An error occurred while searching. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAppSelect = (app: AppStoreSearchResult) => {
    setSelectedApp(app);
    setValidationStep('confirmed');
  };

  const handleConfirmApp = () => {
    if (!selectedApp) return;

    const validatedApp: ValidatedApp = {
      appId: selectedApp.appId || selectedApp.title,
      metadata: selectedApp,
      isValid: true
    };

    console.log('✅ App validated:', validatedApp);
    onAppValidated(validatedApp);

    toast({
      title: 'App Validated',
      description: `${selectedApp.name} has been validated and is ready for audit.`,
    });
  };

  const resetSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedApp(null);
    setValidationStep('search');
  };

  return (
    <div className="space-y-6">
      {/* Search Step */}
      {validationStep === 'search' && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Search className="h-5 w-5 text-yodel-orange" />
              <span>App Store Validation</span>
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Search for your app in the App Store to validate it exists and pull metadata for intelligent query generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">App Name or App Store ID</Label>
              <div className="flex space-x-2">
                <Input
                  placeholder="e.g., Instagram, Spotify, or App Store ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  disabled={isSearching}
                />
                <Button 
                  onClick={handleSearch}
                  disabled={isSearching || !searchTerm.trim()}
                  className="bg-yodel-orange hover:bg-yodel-orange/90 text-white"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm text-blue-200 font-medium">Why App Validation?</p>
                  <ul className="text-sm text-blue-300 space-y-1">
                    <li>• Ensures we're auditing a real, existing app</li>
                    <li>• Pulls app metadata (category, description, etc.) for smart query generation</li>
                    <li>• Provides accurate app context for ChatGPT testing</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Step */}
      {validationStep === 'results' && searchResults.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Search Results</span>
              <Button variant="outline" size="sm" onClick={resetSearch}>
                New Search
              </Button>
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchTerm}"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {searchResults.map((app, index) => (
                <div 
                  key={index}
                  className="p-4 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start space-x-4">
                    {app.icon && (
                      <img 
                        src={app.icon} 
                        alt={app.name}
                        className="w-16 h-16 rounded-xl flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-white truncate">
                            {app.name}
                          </h3>
                          <p className="text-sm text-zinc-400 mb-2">
                            by {app.developer || 'Unknown Developer'}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleAppSelect(app)}
                          className="bg-yodel-orange hover:bg-yodel-orange/90 text-white"
                        >
                          Select
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-4 mb-3">
                        {app.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm text-zinc-300">
                              {app.rating}
                            </span>
                          </div>
                        )}
                        {app.applicationCategory && (
                          <Badge variant="outline" className="text-zinc-400 border-zinc-600">
                            {app.applicationCategory}
                          </Badge>
                        )}
                        {app.reviews && (
                          <span className="text-sm text-zinc-400">
                            {app.reviews.toLocaleString()} reviews
                          </span>
                        )}
                      </div>
                      
                      {app.description && (
                        <p className="text-sm text-zinc-400 line-clamp-2 mb-2">
                          {app.description}
                        </p>
                      )}

                      {app.url && (
                        <a 
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-yodel-orange hover:text-yodel-orange/80"
                        >
                          View in App Store <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Step */}
      {validationStep === 'confirmed' && selectedApp && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>App Validated</span>
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Confirm this is the correct app for your audit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* App Summary */}
              <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
                <div className="flex items-start space-x-4">
                  {selectedApp.icon && (
                    <img 
                      src={selectedApp.icon} 
                      alt={selectedApp.name}
                      className="w-20 h-20 rounded-xl flex-shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {selectedApp.name}
                    </h3>
                    <p className="text-zinc-300 mb-2">
                      by {selectedApp.developer || 'Unknown Developer'}
                    </p>
                    
                    <div className="flex items-center gap-4 mb-3">
                      {selectedApp.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-zinc-300">
                            {selectedApp.rating}
                          </span>
                        </div>
                      )}
                      {selectedApp.applicationCategory && (
                        <Badge variant="outline" className="text-zinc-300 border-zinc-600">
                          {selectedApp.applicationCategory}
                        </Badge>
                      )}
                    </div>

                    {selectedApp.description && (
                      <p className="text-sm text-zinc-400 line-clamp-3">
                        {selectedApp.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Metadata Preview */}
              <div className="space-y-3">
                <Label className="text-white font-medium">Extracted Metadata for Query Generation:</Label>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-400">App ID:</span>
                    <span className="text-white ml-2">{selectedApp.appId || selectedApp.title}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Category:</span>
                    <span className="text-white ml-2">{selectedApp.applicationCategory || 'General'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Developer:</span>
                    <span className="text-white ml-2">{selectedApp.developer || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Rating:</span>
                    <span className="text-white ml-2">{selectedApp.rating || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  onClick={handleConfirmApp}
                  className="bg-yodel-orange hover:bg-yodel-orange/90 text-white flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm & Continue
                </Button>
                <Button
                  onClick={resetSearch}
                  variant="outline"
                  className="border-zinc-600"
                >
                  Search Different App
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {validationStep === 'results' && searchResults.length === 0 && !isSearching && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Apps Found</h3>
            <p className="text-zinc-400 mb-4">
              We couldn't find any apps matching "{searchTerm}" in the App Store.
            </p>
            <Button onClick={resetSearch} variant="outline">
              Try Different Search
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};