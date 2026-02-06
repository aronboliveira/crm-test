export interface ResetDeliveryPort {
  deliver(
    input: Readonly<{ email: string; token: string }>,
  ): Promise<Readonly<{ devToken?: string }>>;
}
