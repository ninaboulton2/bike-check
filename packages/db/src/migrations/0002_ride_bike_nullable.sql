ALTER TABLE "ride_logs" ALTER COLUMN "bike_id" DROP NOT NULL;
ALTER TABLE "ride_logs" DROP CONSTRAINT IF EXISTS "ride_logs_bike_id_bikes_id_fk";
ALTER TABLE "ride_logs" ADD CONSTRAINT "ride_logs_bike_id_bikes_id_fk" FOREIGN KEY ("bike_id") REFERENCES "bikes"("id") ON DELETE SET NULL;
