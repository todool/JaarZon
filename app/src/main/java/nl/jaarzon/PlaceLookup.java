package nl.jaarzon;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

/** Small callback adapter shared by Android Geocoder and deterministic tests. */
public final class PlaceLookup {
    public interface Result {
        void success(String locality, String area, String country);
        void error();
    }
    public interface Source { void lookup(double latitude, double longitude, Result result); }
    public static Runnable start(Source source, double latitude, double longitude, Consumer<String> callback) {
        AtomicBoolean finished = new AtomicBoolean();
        Result result = new Result() {
            private void done(String name) { if (finished.compareAndSet(false, true)) callback.accept(name); }
            public void success(String locality, String area, String country) {
                String town = clean(locality);
                if (town.isEmpty()) town = clean(area);
                String nation = clean(country);
                done(town.isEmpty() ? "" : town + (nation.isEmpty() || nation.equals(town) ? "" : ", " + nation));
            }
            public void error() { done(""); }
        };
        try { source.lookup(latitude, longitude, result); } catch (RuntimeException failure) { result.error(); }
        return () -> finished.set(true);
    }
    private static String clean(String text) { return text == null ? "" : text.trim(); }
}
