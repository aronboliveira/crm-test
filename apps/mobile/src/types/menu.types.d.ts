export type MenuItem = Readonly<{
  id: string;
  label: string;
  to: string;
  perm?: string;
}>;

export type MenuSection = Readonly<{
  id: string;
  label: string;
  items: readonly MenuItem[];
}>;

export type NavItem = Readonly<{
  to: string;
  label: string;
  key: string;
}>;
