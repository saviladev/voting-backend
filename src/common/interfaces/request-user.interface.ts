export interface RequestUser {
  id: string;
  dni: string;
  chapterId: string;
  roles: string[];
  permissions: string[];
  sessionTokenHash: string;
}
