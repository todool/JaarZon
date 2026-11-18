import nl.jaarzon.LocationPolicy;

public class LocationPolicyTest {
    static int checks;
    static void check(boolean condition) { checks++; if (!condition) throw new AssertionError("Check " + checks); }
    public static void main(String[] args) {
        check(nl.jaarzon.LanguagePolicy.resolve("", "nl-NL").equals("nl"));
        check(nl.jaarzon.LanguagePolicy.resolve("", "en-US").equals("en"));
        check(nl.jaarzon.LanguagePolicy.resolve("", "de-DE").equals("nl"));
        check(nl.jaarzon.LanguagePolicy.resolve("nl", "en-US").equals("nl"));
        check(nl.jaarzon.LanguagePolicy.resolve("en", "nl-NL").equals("en"));
        check(nl.jaarzon.LanguagePolicy.resolve("", "fr-FR").equals("nl"));
        long now = 200_000_000_000L;
        check(LocationPolicy.acceptable(51.8, 4.57, 10, now, now));
        check(LocationPolicy.acceptable(50.85, 5.69, 3000, now - 60_000_000_000L, now));
        check(!LocationPolicy.acceptable(51.8, 4.57, 5001, now, now));
        check(!LocationPolicy.acceptable(51.8, 4.57, 10, now - 121_000_000_000L, now));
        check(!LocationPolicy.acceptable(51.8, 4.57, 10, now + 1, now));
        check(!LocationPolicy.acceptable(Double.NaN, 4.57, 10, now, now));
        check(!LocationPolicy.acceptable(91, 4.57, 10, now, now));
        check(!LocationPolicy.acceptable(51.8, 181, 10, now, now));
        check(!LocationPolicy.acceptable(51.8, 4.57, Float.NaN, now, now));
        check(LocationPolicy.timeZone(51.8, 4.57).equals("Europe/Amsterdam"));
        check(LocationPolicy.timeZone(52.3676,4.9041,1000).equals("Europe/Amsterdam"));
        check(LocationPolicy.timeZone(50.85,5.69).equals("Europe/Amsterdam"));
        check(LocationPolicy.timeZone(50.85,5.69,5000).equals("Europe/Amsterdam"));
        // Dutch coverage must not depend on proximity to one of the former city circles.
        double[][] dutchLocations = {{50.8495,5.7188},{50.834,5.707},{52.0907,5.1214},
                {53.2194,6.5665},{53.2012,5.7999},{52.2215,6.8937},{51.4416,5.4697},
                {51.8429,5.8520},{51.9851,5.8987},{51.5555,5.0913},{51.4988,3.6109},
                {51.3704,6.1724},{52.9563,4.7608},{53.0542,4.7975},{50.7700,6.0180}};
        for (double[] point : dutchLocations) {
            if (!LocationPolicy.timeZone(point[0],point[1],5000).equals("Europe/Amsterdam"))
                throw new AssertionError("Dutch position not recognized: " + point[0] + "," + point[1]);
            check(true);
        }
        check(LocationPolicy.timeZone(51.0543,3.7174,100).equals("UTC")); // Gent is not Netherlands.
        check(LocationPolicy.timeZone(50.7753,6.0839,100).equals("UTC")); // Aachen is not Netherlands.
        check(LocationPolicy.timeZone(12.15,-68.27,100).equals("UTC")); // Caribbean Netherlands != Amsterdam.
        check(LocationPolicy.ruleZone("Europe/Amsterdam","Europe/London").equals("Europe/Amsterdam"));
        check(LocationPolicy.ruleZone("Europe/London","Europe/Amsterdam").equals("Europe/London"));
        check(LocationPolicy.ruleZone("UTC","Europe/Amsterdam").equals("UTC"));
        check(LocationPolicy.ruleZone("Europe/Amsterdam","Europe/Amsterdam").equals("Europe/Amsterdam"));
        check(LocationPolicy.ruleZone("America/New_York","US/Eastern").equals("US/Eastern"));
        check(LocationPolicy.ruleZone("Europe/Amsterdam","Invalid/Zone").equals("Europe/Amsterdam"));
        check(LocationPolicy.timeZone(51.5074,-0.1278,1000).equals("Europe/London"));
        check(LocationPolicy.timeZone(40.71,-74.0).equals("America/New_York"));
        check(LocationPolicy.timeZone(35.6762,139.6503,1000).equals("Asia/Tokyo"));
        check(LocationPolicy.timeZone(0,0).equals("UTC"));
        check(LocationPolicy.storedUsable(52,4,100,100000,999999999));
        check(!LocationPolicy.storedUsable(Double.NaN,4,100,100000,999999999));
        check(!LocationPolicy.storedUsable(52,4,100,0,999999999));
        check(!LocationPolicy.storedUsable(52,4,100,999999999,100000));
        for (String zone : new String[]{"Europe/Amsterdam","Europe/London","America/New_York"}) {
            for (int year : new int[]{2024,2026,2028}) {
                for (int month : new int[]{1,7}) {
                    long instant = java.time.Instant.parse(year + (month == 1 ? "-01-15T12:00:00Z" : "-07-15T12:00:00Z")).toEpochMilli();
                    long offset = 0;
                    for (long[] entry : LocationPolicy.offsets(zone,year)) { if (entry[0] > instant) break; offset = entry[1]; }
                    int expected = zone.equals("Europe/Amsterdam") ? (month == 1 ? 3600 : 7200)
                            : zone.equals("Europe/London") ? (month == 1 ? 0 : 3600) : (month == 1 ? -18000 : -14400);
                    check(offset == expected);
                }
            }
        }
        check(LocationPolicy.savedPlace(50,5,50,5,"Maastricht").equals("Maastricht"));
        check(LocationPolicy.savedPlace(51,5,50,5,"Maastricht").isEmpty());
        check(LocationPolicy.savedPlace(50,6,50,5,"Maastricht").isEmpty());
        check(LocationPolicy.savedPlace(50,5,Double.NaN,5,"Maastricht").isEmpty());
        check(LocationPolicy.savedPlace(Double.NaN,5,Double.NaN,5,"Maastricht").isEmpty());
        check(LocationPolicy.savedPlace(50,5,50,5,null).isEmpty());
        check(LocationPolicy.savedPlace(50,5,50,5,"").isEmpty());
        System.out.println("LocationPolicy: " + checks + " controles geslaagd.");
    }
}
