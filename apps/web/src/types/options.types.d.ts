export type ProjectOption = Readonly<{
  id: string;
  name: string;
  status: "active" | "archived" | string;
}>;
