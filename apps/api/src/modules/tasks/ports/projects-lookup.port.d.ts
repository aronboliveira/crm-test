export interface ProjectsLookupPort {
  existsById(id: string): Promise<boolean>;
}
