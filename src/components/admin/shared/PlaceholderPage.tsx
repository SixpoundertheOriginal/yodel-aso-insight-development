import React from 'react';
import { Link } from 'react-router-dom';

export interface PlaceholderPageProps {
  title: string;
  description: string;
  status: 'in_development' | 'coming_soon';
  estimatedCompletion?: string;
  requiredFeatures?: string[];
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description,
  status,
  estimatedCompletion,
  requiredFeatures = [],
}) => {
  return (
    <div className="max-w-3xl mx-auto py-12 text-center space-y-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-gray-600">{description}</p>
      <div>
        {status === 'in_development' ? (
          <span className="bg-yellow-500 text-white px-3 py-1 rounded">
            In Development
          </span>
        ) : (
          <span className="bg-gray-500 text-white px-3 py-1 rounded">
            Coming Soon
          </span>
        )}
      </div>
      {estimatedCompletion && (
        <p className="text-sm text-gray-500">
          Estimated completion: {estimatedCompletion}
        </p>
      )}
      {requiredFeatures.length > 0 && (
        <div className="text-left max-w-md mx-auto">
          <p className="font-medium mb-2">Prerequisites:</p>
          <ul className="list-disc list-inside text-sm text-gray-500">
            {requiredFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-sm text-gray-500">
        We're working hard to bring this feature to you. Thank you for your
        patience!
      </p>
      <Link to="/admin" className="text-orange-500 hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
};

export default PlaceholderPage;
