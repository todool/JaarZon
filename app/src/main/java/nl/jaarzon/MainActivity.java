package nl.jaarzon;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.Manifest;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.location.Geocoder;
import android.location.Address;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import org.json.JSONArray;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.TimeUnit;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import org.json.JSONObject;
import org.json.JSONException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;

/** Single local screen; no JavaScript bridge, network permission or remote resources. */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private String language;
    private boolean restoreLocation, currentDefault = true, currentPrevious;
    private int currentReason = R.string.reason_searching;
    private long selectedDate;
    @Override protected void attachBaseContext(android.content.Context base) {
        String choice = Build.VERSION.SDK_INT >= 33
                ? base.getSystemService(android.app.LocaleManager.class).getApplicationLocales().toLanguageTags()
                : base.getSharedPreferences("language", MODE_PRIVATE).getString("choice", "");
        Locale system = Build.VERSION.SDK_INT >= 33
                ? base.getSystemService(android.app.LocaleManager.class).getSystemLocales().get(0)
                : android.content.res.Resources.getSystem().getConfiguration().getLocales().get(0);
        language = LanguagePolicy.resolve(choice, system.toLanguageTag());
        android.content.res.Configuration config = new android.content.res.Configuration(base.getResources().getConfiguration());
        config.setLocale(Locale.forLanguageTag(language));
        super.attachBaseContext(base.createConfigurationContext(config));
    }
    private void chooseLanguage() {
        String choice = Build.VERSION.SDK_INT >= 33
                ? getSystemService(android.app.LocaleManager.class).getApplicationLocales().toLanguageTags()
                : getSharedPreferences("language", MODE_PRIVATE).getString("choice", "");
        int checked = choice.startsWith("nl") ? 1 : choice.startsWith("en") ? 2 : 0;
        new AlertDialog.Builder(this).setTitle(R.string.language_title).setSingleChoiceItems(new String[]{
                getString(R.string.language_auto), getString(R.string.language_nl), getString(R.string.language_en)}, checked, (dialog, index) -> {
            dialog.dismiss();
            String tag = new String[]{"", "nl", "en"}[index];
            if (Build.VERSION.SDK_INT >= 33) getSystemService(android.app.LocaleManager.class)
                    .setApplicationLocales(android.os.LocaleList.forLanguageTags(tag));
            else { getSharedPreferences("language", MODE_PRIVATE).edit().putString("choice", tag).apply(); recreate(); }
        }).show();
    }
    @Override protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        state.putBoolean("location_ready", locationInfo != null);
        state.putBoolean("location_default", currentDefault); state.putBoolean("location_previous", currentPrevious);
        state.putInt("location_reason", currentReason); state.putDouble("latitude", currentLatitude);
        state.putDouble("longitude", currentLongitude); state.putFloat("accuracy", currentAccuracy);
        state.putLong("timestamp", currentTimestamp); state.putString("place", currentPlace);
        state.putLong("selected_date", selectedDate);
    }
    private WebView webView;
    private LocationManager locations;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean pageReady, searching;
    private volatile boolean foreground;
    private JSONObject locationInfo;
    private SharedPreferences saved;
    private final Handler nameHandler = new Handler(Looper.getMainLooper());
    private final ThreadPoolExecutor geocodeWorker = new ThreadPoolExecutor(1, 1, 0L, TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(1), new ThreadPoolExecutor.DiscardOldestPolicy());
    private Runnable cancelName = () -> {};
    private int nameGeneration;
    private boolean explanationShowing;
    private double currentLatitude, currentLongitude;
    private float currentAccuracy;
    private long currentTimestamp;
    private String currentPlace = "";
    private final Runnable locationTimeout = () -> fallback(R.string.reason_timeout);
    private final LocationListener listener = new LocationListener() {
        @Override public void onLocationChanged(Location location) { accept(location); }
        @Override public void onStatusChanged(String provider, int status, Bundle extras) { }
        @Override public void onProviderEnabled(String provider) { }
        @Override public void onProviderDisabled(String provider) {
            if (searching && !enabled()) fallback(R.string.reason_disabled);
        }
    };

    @SuppressLint("SetJavaScriptEnabled") // Only trusted, bundled application code executes.
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (state != null) {
            restoreLocation = state.getBoolean("location_ready"); currentDefault = state.getBoolean("location_default");
            currentPrevious = state.getBoolean("location_previous"); currentReason = state.getInt("location_reason", R.string.reason_searching);
            currentLatitude = state.getDouble("latitude"); currentLongitude = state.getDouble("longitude");
            currentAccuracy = state.getFloat("accuracy"); currentTimestamp = state.getLong("timestamp");
            currentPlace = state.getString("place", ""); selectedDate = state.getLong("selected_date");
        }
        locations = (LocationManager) getSystemService(LOCATION_SERVICE);
        saved = getSharedPreferences("last_location", MODE_PRIVATE);
        webView = new WebView(this);
        webView.setBackgroundColor(0xfff5f3ec);
        FrameLayout container = new FrameLayout(this);
        container.setBackgroundColor(0xfff5f3ec);
        container.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(container);
        container.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars()
                        | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        container.requestApplyInsets();
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setBlockNetworkLoads(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setDomStorageEnabled(false);
        settings.setGeolocationEnabled(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptCookie(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request.isForMainFrame() && request.getUrl().toString().equals(ORIGIN + "/privacy")) openPrivacyPolicy();
                if (request.isForMainFrame() && request.getUrl().toString().equals(ORIGIN + "/locate")) locate(true);
                if (request.isForMainFrame() && "https".equals(request.getUrl().getScheme())
                        && "appassets.androidplatform.net".equals(request.getUrl().getHost()) && "/language".equals(request.getUrl().getPath())) {
                    try { selectedDate = Long.parseLong(request.getUrl().getQueryParameter("date")); } catch (RuntimeException ignored) { selectedDate = 0; }
                    chooseLanguage();
                }
                return true; // No navigation away from the bundled screen.
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (url.equals(ORIGIN + "/index.html")) { pageReady = true; if (restoreLocation) { restoreLocation = false; renderCurrent(); if (!currentDefault) findPlace(); } else firstLocate(); }
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                String file = null;
                String mime = null;
                if (request.getMethod().equals("GET")) {
                    if (url.equals(ORIGIN + "/index.html")) { file = "index.html"; mime = "text/html"; }
                    if (url.equals(ORIGIN + "/daylength.js")) { file = "daylength.js"; mime = "text/javascript"; }
                    if (url.equals(ORIGIN + "/i18n.js")) {
                        try {
                            String source = "globalThis.JaarZonLanguage=" + JSONObject.quote(language) + ";globalThis.JaarZonSelectedDate=" + selectedDate + ";\n";
                            return new WebResourceResponse("text/javascript", "UTF-8", new java.io.SequenceInputStream(new ByteArrayInputStream(source.getBytes(java.nio.charset.StandardCharsets.UTF_8)), getAssets().open("i18n.js")));
                        } catch (IOException ignored) { return new WebResourceResponse("text/javascript", "UTF-8", new ByteArrayInputStream(new byte[0])); }
                    }
                    if (url.equals(ORIGIN + "/style.css")) { file = "style.css"; mime = "text/css"; }
                }
                if (file != null) {
                    try {
                        return new WebResourceResponse(mime, "UTF-8", 200, "OK",
                                Collections.singletonMap("Cache-Control", "no-store"), getAssets().open(file));
                    } catch (IOException ignored) { /* Return a closed response below. */ }
                }
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden",
                        Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
        });
        webView.loadUrl(ORIGIN + "/index.html");
    }

    private void openPrivacyPolicy() {
        android.net.Uri uri = android.net.Uri.parse("https://todool.github.io/JaarZon/privacy/"
                + ("en".equals(language) ? "en.html" : "nl.html"));
        android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW, uri)
                .addCategory(android.content.Intent.CATEGORY_BROWSABLE);
        try {
            startActivity(intent);
        } catch (android.content.ActivityNotFoundException | SecurityException unavailable) {
            android.widget.Toast.makeText(this, R.string.privacy_no_browser, android.widget.Toast.LENGTH_LONG).show();
        }
    }

    private boolean permitted() {
        return checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }
    private boolean enabled() {
        if (locations == null) return false;
        if (Build.VERSION.SDK_INT >= 28 && !locations.isLocationEnabled()) return false;
        for (String provider : locations.getProviders(true)) {
            if (!provider.equals(LocationManager.PASSIVE_PROVIDER)) return true;
        }
        return false;
    }
    private void stopLocation() {
        searching = false;
        handler.removeCallbacksAndMessages(null);
        if (locations != null) {
            try { locations.removeUpdates(listener); } catch (SecurityException ignored) { /* Permission revoked. */ }
        }
    }
    private void publish(double latitude, double longitude, String label, String timeZone) {
        try {
            JSONArray offsets = new JSONArray();
            String ruleZone = LocationPolicy.ruleZone(timeZone, java.util.TimeZone.getDefault().getID());
            for (long[] entry : LocationPolicy.offsets(ruleZone, java.time.Year.now().getValue()))
                offsets.put(new JSONArray().put(entry[0]).put(entry[1]));
            JSONObject rules = new JSONObject().put("zone", timeZone).put("offsets", offsets);
            locationInfo = new JSONObject().put("latitude", latitude).put("longitude", longitude)
                    .put("timeZone", timeZone).put("zoneRules", rules).put("label", label).put("zoneLabel",
                            timeZone.equals("UTC") ? getString(R.string.unknown_zone)
                                    : getString(R.string.zone, timeZone));
            if (pageReady && webView != null) webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('jaarzon-location',{detail:" + locationInfo + "}))", null);
        } catch (JSONException impossible) { throw new IllegalStateException(impossible); }
    }
    private void firstLocate() {
        if (!permitted() && !saved.getBoolean("permission_explained", false)) locate(true);
        else locate(false);
    }
    private void cancelGeocoding() {
        nameGeneration++;
        cancelName.run();
        nameHandler.removeCallbacksAndMessages(null);
        geocodeWorker.getQueue().clear();
    }
    private void showCurrent(boolean previous, int reason) {
        currentDefault = false; currentPrevious = previous; currentReason = reason;
        String coordinates = getString(R.string.coordinates, Math.abs(currentLatitude),
                getString(currentLatitude < 0 ? R.string.south : R.string.north), Math.abs(currentLongitude),
                getString(currentLongitude < 0 ? R.string.west : R.string.east));
        String label = getString(R.string.location, currentPlace.isEmpty() ? coordinates : currentPlace);
        if (previous) label = getString(R.string.previous_location, label, java.time.format.DateTimeFormatter
                .ofPattern("dd MMM yyyy HH:mm 'UTC'", Locale.forLanguageTag(language)).withZone(java.time.ZoneOffset.UTC)
                .format(java.time.Instant.ofEpochMilli(currentTimestamp)), getString(reason));
        String zone = LocationPolicy.timeZone(currentLatitude, currentLongitude, currentAccuracy);
        publish(currentLatitude, currentLongitude, label, zone);
    }
    private void fallback(int reason) {
        stopLocation();
        cancelGeocoding();
        double lat = Double.longBitsToDouble(saved.getLong("latitude", Double.doubleToLongBits(Double.NaN)));
        double lon = Double.longBitsToDouble(saved.getLong("longitude", Double.doubleToLongBits(Double.NaN)));
        float accuracy = saved.getFloat("accuracy", Float.NaN);
        long timestamp = saved.getLong("timestamp", 0);
        if (LocationPolicy.storedUsable(lat, lon, accuracy, timestamp, System.currentTimeMillis())) {
            currentLatitude = lat; currentLongitude = lon; currentAccuracy = accuracy;
            currentTimestamp = timestamp; currentPlace = saved.getString("place", "");
            showCurrent(true, reason);
        } else { currentDefault = true; currentReason = reason; renderCurrent(); }
    }
    private void renderCurrent() {
        if (currentDefault) publish(52.3676, 4.9041, getString(R.string.default_location, getString(currentReason)), "Europe/Amsterdam");
        else showCurrent(currentPrevious, currentReason);
    }
    private void saveCurrent() {
        saved.edit().putLong("latitude", Double.doubleToLongBits(currentLatitude))
                .putLong("longitude", Double.doubleToLongBits(currentLongitude)).putFloat("accuracy", currentAccuracy)
                .putLong("timestamp", currentTimestamp).putString("place", currentPlace).apply();
    }
    private boolean accept(Location fix) {
        if (!searching || !foreground || fix == null || !fix.hasAccuracy() || !LocationPolicy.acceptable(
                fix.getLatitude(), fix.getLongitude(), fix.getAccuracy(), fix.getElapsedRealtimeNanos(),
                SystemClock.elapsedRealtimeNanos())) return false;
        stopLocation(); cancelGeocoding();
        currentLatitude = fix.getLatitude(); currentLongitude = fix.getLongitude(); currentAccuracy = fix.getAccuracy();
        currentTimestamp = System.currentTimeMillis() - (SystemClock.elapsedRealtimeNanos() - fix.getElapsedRealtimeNanos())/1_000_000;
        currentPlace = Double.longBitsToDouble(saved.getLong("latitude", 0)) == currentLatitude
                && Double.longBitsToDouble(saved.getLong("longitude", 0)) == currentLongitude ? saved.getString("place", "") : "";
        saveCurrent(); showCurrent(false, 0);
        findPlace();
        return true;
    }
    private void deliverAddresses(List<Address> addresses, PlaceLookup.Result result) {
        if (addresses == null || addresses.isEmpty() || addresses.get(0) == null) { result.error(); return; }
        Address address = addresses.get(0);
        result.success(address.getLocality(), address.getSubAdminArea(), address.getCountryName());
    }
    @SuppressWarnings("deprecation")
    private void findPlace() {
        if (!foreground || !permitted()) return;
        final int generation = ++nameGeneration;
        final double lat = currentLatitude, lon = currentLongitude;
        cancelName = PlaceLookup.start((latitude, longitude, result) -> geocodeWorker.execute(() -> {
            try {
                if (!foreground || !permitted() || !Geocoder.isPresent()) { result.error(); return; }
                Geocoder coder = new Geocoder(getApplicationContext(), Locale.forLanguageTag(language));
                if (Build.VERSION.SDK_INT >= 33) {
                    coder.getFromLocation(latitude, longitude, 1, new Geocoder.GeocodeListener() {
                        public void onGeocode(List<Address> addresses) { deliverAddresses(addresses, result); }
                        public void onError(String message) { result.error(); }
                    });
                } else deliverAddresses(coder.getFromLocation(latitude, longitude, 1), result);
            } catch (IOException | RuntimeException error) { result.error(); }
        }), lat, lon, name -> nameHandler.post(() -> {
            if (!foreground || !permitted() || generation != nameGeneration) return;
            nameHandler.removeCallbacksAndMessages(null);
            if (!name.isEmpty()) { currentPlace = name; saveCurrent(); renderCurrent(); }
        }));
        nameHandler.postDelayed(() -> { if (generation == nameGeneration) cancelGeocoding(); }, 5000);
    }
    private void askPermission() {
        if (explanationShowing || !foreground) return;
        explanationShowing = true;
        saved.edit().putBoolean("permission_explained", true).apply();
        new AlertDialog.Builder(this).setTitle(R.string.permission_title)
                .setMessage(R.string.permission_message)
                .setPositiveButton(R.string.continue_label, (dialog, which) -> requestPermissions(new String[]{
                        Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION}, 42))
                .setNegativeButton(R.string.not_now, (dialog, which) -> fallback(R.string.reason_permission))
                .setOnDismissListener(dialog -> explanationShowing = false).show();
    }
    @SuppressLint("MissingPermission") // Checked at entry; revocation races caught below.
    private void locate(boolean ask) {
        stopLocation();
        if (!foreground) return;
        if (!permitted()) {
            fallback(R.string.reason_permission);
            if (ask) askPermission();
            return;
        }
        if (!enabled()) { fallback(R.string.reason_disabled); return; }
        fallback(R.string.reason_searching);
        searching = true;
        List<String> providers = new ArrayList<>(locations.getProviders(true));
        boolean requested = false;
        try {
            Location best = null;
            for (String provider : providers) {
                if (provider.equals(LocationManager.PASSIVE_PROVIDER)) continue;
                if (provider.equals(LocationManager.GPS_PROVIDER)
                        && checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) continue;
                try {
                    Location cached = locations.getLastKnownLocation(provider);
                    if (cached != null && cached.hasAccuracy() && LocationPolicy.acceptable(cached.getLatitude(),
                            cached.getLongitude(), cached.getAccuracy(), cached.getElapsedRealtimeNanos(),
                            SystemClock.elapsedRealtimeNanos()) && (best == null || cached.getAccuracy() < best.getAccuracy())) best = cached;
                } catch (SecurityException ignored) { /* Try another permitted provider. */ }
            }
            // Prefer a new fix; retain only a sufficiently recent, accurate cached candidate.
            final Location recent = best;
            handler.postDelayed(() -> { if (searching && recent != null) accept(recent); }, 9000);
            for (String provider : providers) {
                if (provider.equals(LocationManager.PASSIVE_PROVIDER)) continue;
                if (provider.equals(LocationManager.GPS_PROVIDER)
                        && checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) continue;
                try { locations.requestLocationUpdates(provider, 0, 0, listener, Looper.getMainLooper()); requested = true; }
                catch (SecurityException | IllegalArgumentException ignored) { /* Coarse-only/provider unavailable. */ }
            }
            if (!requested && !accept(recent)) fallback(R.string.reason_provider);
            else if (searching) handler.postDelayed(locationTimeout, 10000);
        } catch (SecurityException revoked) { fallback(R.string.reason_revoked); }
    }
    @Override public void onRequestPermissionsResult(int request, String[] permissions, int[] grants) {
        super.onRequestPermissionsResult(request, permissions, grants);
        if (request == 42) locate(false);
    }

    @Override protected void onResume() {
        super.onResume();
        foreground = true;
        if (webView != null) { webView.resumeTimers(); webView.onResume(); webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('jaarzon-active',{detail:true}));document.dispatchEvent(new Event('visibilitychange'))", null); }
        if (pageReady) locate(false);
    }
    @Override protected void onPause() {
        foreground = false;
        stopLocation();
        cancelGeocoding();
        if (webView != null) {
            webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('jaarzon-active',{detail:false}))", null);
            webView.onPause();
            webView.pauseTimers();
        }
        super.onPause();
    }
    @Override protected void onDestroy() {
        stopLocation();
        handler.removeCallbacksAndMessages(null);
        cancelGeocoding();
        geocodeWorker.shutdownNow();
        if (webView != null) { webView.destroy(); webView = null; }
        super.onDestroy();
    }
}
