import Ember from "ember";

export default Ember.Component.extend({
  router: null,
  applicationController: null,

  handlerInfos: function() {
    return this.get("router").router.currentHandlerInfos;
  }.property("applicationController.currentPath"),

  /*
    For the pathNames and controllers properties, we must be careful not to NOT
    specify the properties of the route in our dependent keys.

    Observing the controller property of the route causes some serious problems:
    https://github.com/chrisfarber/ember-breadcrumbs/issues/21
  */

  pathNames: (function() {
    return this.get("handlerInfos").map(function(handlerInfo) {
      return handlerInfo.name;
    });
  }).property("handlerInfos.[]"),

  controllers: (function() {
    return this.get("handlerInfos").map(function(handlerInfo) {
      return handlerInfo.handler.controller;
    });
  }).property("handlerInfos.[]"),

  breadCrumbs: function() {
    // optional custom parameters; can be added to handlebars call
    var topLabel = this.get("top-label");
    var topPath = this.get("top-path");
    var topLinkable = this.get("top-linkable");

    var controllers = this.get("controllers");
    var defaultPaths = this.get("pathNames");
    var breadCrumbs = [];

    // match our pseudo-computed value structure
    var computedRE = /{{(.*)}}/;

    if (topPath && topLabel) {
      breadCrumbs.addObject(Ember.Object.create({
        label: topLabel,
        path: topPath,
        linkable: (typeof topLinkable != "undefined") ? topLinkable == "true" : false,
        isCurrent: false
      }));
  }

    controllers.forEach(function(controller, index) {
      var crumbs = controller.get("breadCrumbs") || [];
      var singleCrumb = controller.get("breadCrumb");

      if (!Ember.isBlank(singleCrumb)) {
        crumbs.push({
          label: singleCrumb,
          path: controller.get("breadCrumbPath"),
          model: controller.get("breadCrumbModel"),
        });
      }

      // REWRITE FOR COMPUTED VALUES
      // Enable passing of a pseudo-computed value for multiple breadcrumbs.
      // Structure of value is:  {{title}}
      // "title" will be extracted from string, then used as a key to the
      // controller to get the associated computed value.
      // If there is no computed value with that name, it will not replace
      // the original value, even if it matches the structure.
      // NOTE: We make a clone so as not to overwrite original, which is
      // *apparently* stored and returned for each individual controller.
      var crumbsClone = Ember.$.extend(true, [], crumbs);
      Ember.$.each(crumbsClone, function(index, crumb) {
        Ember.$.each(crumb, function(key, value) {
          if (typeof value == "string") {
            var matchComputed = value.match(computedRE);
            if (matchComputed != null && typeof matchComputed[1] == "string") {
              var newVal = controller.get(matchComputed[1]);
              if (typeof newVal != "undefined") {
                crumb[key] = newVal;
              }
            }
          }
        });
        breadCrumbs.addObject(Ember.Object.create({
          label: crumb.label,
          path: crumb.path || defaultPaths[index],
          model: crumb.model,
          linkable: !Ember.isNone(crumb.linkable) ? crumb.linkable : true,
          isCurrent: false
        }));
      });
    });

    var deepestCrumb = breadCrumbs.get("lastObject");
    if (deepestCrumb) {
      deepestCrumb.isCurrent = true;
    }

    return breadCrumbs;
  }.property(
    "controllers.@each.breadCrumbs",
    "controllers.@each.breadCrumb",
    "controllers.@each.breadCrumbPath",
    "controllers.@each.breadCrumbModel",
    "pathNames.[]")
});
