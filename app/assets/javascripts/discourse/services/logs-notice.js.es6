import EmberObject from "@ember/object";
import {
  default as computed,
  on,
  observes
} from "ember-addons/ember-computed-decorators";
import { autoUpdatingRelativeAge } from "discourse/lib/formatter";

const LOGS_NOTICE_KEY = "logs-notice-text";

const LogsNotice = EmberObject.extend({
  text: "",

  @on("init")
  _setup() {
    if (!this.isActivated) return;

    const text = this.keyValueStore.getItem(LOGS_NOTICE_KEY);
    if (text) this.set("text", text);

    this.messageBus.subscribe("/logs_error_rate_exceeded", data => {
      const duration = data.duration;
      const rate = data.rate;
      let siteSettingLimit = 0;

      if (duration === "minute") {
        siteSettingLimit = this.siteSettings.alert_admins_if_errors_per_minute;
      } else if (duration === "hour") {
        siteSettingLimit = this.siteSettings.alert_admins_if_errors_per_hour;
      }

      let translationKey = rate === siteSettingLimit ? "reached" : "exceeded";
      translationKey += `_${duration}_MF`;

      this.set(
        "text",
        I18n.messageFormat(`logs_error_rate_notice.${translationKey}`, {
          relativeAge: autoUpdatingRelativeAge(
            new Date(data.publish_at * 1000)
          ),
          rate,
          limit: siteSettingLimit,
          url: Discourse.getURL("/logs")
        })
      );
    });
  },

  @computed("text")
  isEmpty(text) {
    return Ember.isEmpty(text);
  },

  @computed("text")
  message(text) {
    return new Handlebars.SafeString(text);
  },

  @computed("currentUser")
  isAdmin(currentUser) {
    return currentUser && currentUser.admin;
  },

  @computed("isEmpty", "isAdmin")
  hidden(isEmpty, isAdmin) {
    return !isAdmin || isEmpty;
  },

  @observes("text")
  _updateKeyValueStore() {
    this.keyValueStore.setItem(LOGS_NOTICE_KEY, this.text);
  },

  @computed(
    "siteSettings.alert_admins_if_errors_per_hour",
    "siteSettings.alert_admins_if_errors_per_minute"
  )
  isActivated(errorsPerHour, errorsPerMinute) {
    return errorsPerHour > 0 || errorsPerMinute > 0;
  }
});

export default LogsNotice;
