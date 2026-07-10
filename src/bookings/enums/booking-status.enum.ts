// String enum (not numeric) so the value stored in Postgres and shown in Swagger/JSON
// responses is a readable label ('CONFIRMED') rather than an opaque index (1) that
// shifts meaning if members are ever reordered.
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}
