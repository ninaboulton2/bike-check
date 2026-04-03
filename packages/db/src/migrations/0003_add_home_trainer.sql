ALTER TABLE "bikes" ADD COLUMN "is_trainer" boolean NOT NULL DEFAULT false;
ALTER TABLE "bikes" ADD COLUMN "linked_bike_id" uuid;
