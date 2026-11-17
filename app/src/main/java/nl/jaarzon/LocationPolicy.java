package nl.jaarzon;

/** Pure acceptance policy; no coordinate storage or network lookup. */
public final class LocationPolicy {
    private LocationPolicy() { }
    public static boolean acceptable(double latitude, double longitude, float accuracy,
            long fixElapsedNanos, long nowElapsedNanos) {
        long age = nowElapsedNanos - fixElapsedNanos;
        return Double.isFinite(latitude) && Math.abs(latitude) <= 90
                && Double.isFinite(longitude) && Math.abs(longitude) <= 180
                && Float.isFinite(accuracy) && accuracy >= 0 && accuracy <= 5000
                && fixElapsedNanos > 0 && age >= 0 && age <= 120_000_000_000L;
    }
    public static String timeZone(double latitude, double longitude) { return timeZone(latitude, longitude, 0); }
    public static String timeZone(double latitude, double longitude, float accuracy) {
        if (!Double.isFinite(latitude) || Math.abs(latitude) > 90 || !Double.isFinite(longitude)
                || Math.abs(longitude) > 180 || !Float.isFinite(accuracy) || accuracy < 0 || accuracy > 5000) return "UTC";
        // Classify the reported position by country, not by distance to Dutch cities.
        if (NetherlandsBoundary.contains(latitude, longitude)) return "Europe/Amsterdam";
        // Conservative interiors, NOT nearest-city extrapolation or world coverage.
        double[][] regions = {{51.5074,-0.1278,30000},
                {40.7128,-74.0060,20000}, {35.6762,139.6503,50000}};
        String[] zones = {"Europe/London","America/New_York","Asia/Tokyo"};
        for (int i = 0; i < regions.length; i++) {
            double lat1 = Math.toRadians(latitude), lat2 = Math.toRadians(regions[i][0]);
            double a = Math.pow(Math.sin((lat1-lat2)/2),2) + Math.cos(lat1)*Math.cos(lat2)
                    * Math.pow(Math.sin(Math.toRadians(longitude-regions[i][1])/2),2);
            double distance = 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1,a)));
            if (Float.isFinite(accuracy) && accuracy >= 0 && distance + accuracy <= regions[i][2]) return zones[i];
        }
        return "UTC";
    }
    public static String ruleZone(String geographicZone, String deviceZone) {
        // Never use a device setting to turn an unknown geographic zone into a guess.
        if (!"UTC".equals(geographicZone) && deviceZone != null) {
            try {
                if (java.time.ZoneId.of(geographicZone).getRules().equals(java.time.ZoneId.of(deviceZone).getRules())) return deviceZone;
            } catch (java.time.DateTimeException ignored) { /* Use the established geographic zone. */ }
        }
        return geographicZone;
    }
    public static boolean storedUsable(double latitude, double longitude, float accuracy, long timestamp, long now) {
        return Double.isFinite(latitude) && Math.abs(latitude) <= 90 && Double.isFinite(longitude)
                && Math.abs(longitude) <= 180 && Float.isFinite(accuracy) && accuracy >= 0 && accuracy <= 5000
                && timestamp > 0 && timestamp <= now + 60000;
    }
    public static java.util.List<long[]> offsets(String zone, int year) {
        java.time.zone.ZoneRules rules = java.time.ZoneId.of(zone).getRules();
        java.time.Instant from = java.time.LocalDate.of(year-2,1,1).atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
        java.time.Instant end = java.time.LocalDate.of(year+3,1,1).atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
        java.util.List<long[]> result = new java.util.ArrayList<>();
        result.add(new long[]{from.toEpochMilli(), rules.getOffset(from).getTotalSeconds()});
        java.time.zone.ZoneOffsetTransition transition = rules.nextTransition(from.minusSeconds(1));
        while (transition != null && transition.getInstant().isBefore(end)) {
            result.add(new long[]{transition.getInstant().toEpochMilli(), transition.getOffsetAfter().getTotalSeconds()});
            transition = rules.nextTransition(transition.getInstant());
        }
        return result;
    }
}
