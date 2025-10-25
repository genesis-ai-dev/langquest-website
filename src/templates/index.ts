export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
}

export const projectTemplates: ProjectTemplate[] = [
  {
    id: 'unstructured',
    name: 'Unstructured',
    description: 'General purpose project template for unstructured content'
  },
  {
    id: 'bible',
    name: 'Bible',
    description: 'Specialized template for Bible translation projects'
  }
];
