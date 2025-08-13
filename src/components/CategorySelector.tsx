import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CategorySelectorProps {
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  availableCategories: string[];
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onCategoryChange,
  availableCategories,
}) => (
  <Select value={selectedCategory} onValueChange={onCategoryChange}>
    <SelectTrigger className="w-48 h-8 bg-zinc-800 border-zinc-700 text-foreground">
      <SelectValue placeholder="Select app category" />
    </SelectTrigger>
    <SelectContent className="bg-zinc-800 border-zinc-700">
      {availableCategories.map((category) => (
        <SelectItem
          key={category}
          value={category}
          className="text-foreground hover:bg-zinc-700"
        >
          {category}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default CategorySelector;
