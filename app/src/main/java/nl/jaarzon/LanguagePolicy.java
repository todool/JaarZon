package nl.jaarzon;

/** UI language only; never changes location or time zone. */
public final class LanguagePolicy {
    private LanguagePolicy() { }
    public static String resolve(String choice, String system) {
        String tag = choice == null || choice.isEmpty() ? system : choice;
        return tag != null && tag.toLowerCase(java.util.Locale.ROOT).split("[-_,]")[0].equals("en") ? "en" : "nl";
    }
}
