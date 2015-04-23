import Ember from "ember";

export default Ember.Component.extend({
  router: null,
  applicationController: null,

  handlerInfos: Ember.computed("applicationController.currentPath", function() {
    return this.get("router").router.currentHandlerInfos;
  }),

  /*
    For the pathNames and controllers properties, we must be careful not to NOT
    specify the properties of the route in our dependent keys.

    Observing the controller property of the route causes some serious problems:
    https://github.com/chrisfarber/ember-breadcrumbs/issues/21
  */

  pathNames: Ember.computed("handlerInfos.[]", function() {
    return this.get("handlerInfos").map(function(handlerInfo) {
      return handlerInfo.name;
    });
  }),

  controllers: Ember.computed("handlerInfos.[]", function() {
    return this.get("handlerInfos").map(function(handlerInfo) {
      return handlerInfo.handler.controller;
    });
  }),

  breadCrumbs: Ember.computed("controllers.@each.breadCrumbs",
    "controllers.@each.breadCrumb",
    "controllers.@each.breadCrumbPath",
    "controllers.@each.breadCrumbModel",
    "pathNames.[]", function() {
    var controllers = this.get("controllers");
    var defaultPaths = this.get("pathNames");
    var breadCrumbs = Ember.A([]);

    // match our pseudo-computed value structure
    var computedRE = /{{(.*)}}/;

    controllers.forEach(function(controller, index) {
      var crumbs = controller.get("breadCrumbs") || Ember.A([]);
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

    var deepestCrumb = Ember.get(breadCrumbs, "lastObject");
    if (deepestCrumb) {
      deepestCrumb.isCurrent = true;
    }

    return breadCrumbs;
  })
});
