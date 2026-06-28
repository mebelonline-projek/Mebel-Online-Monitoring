/** Endpoint admin/dev hanya aktif di development */
export function isDevAdminRouteAllowed(): boolean {
  return process.env.NODE_ENV === "development";
}
