window.ResultView = Backbone.View.extend({
  template: '#result-template',
  tagName: 'li',
  events: { 'click': 'on_click' },
  
  initialize: function() {
    _.bindAll(this, 'render', 'activate');
    this.initializeTemplate();
  },
  
  initializeTemplate: function() {
    this.template = _.template($(this.template).html());
  },
  
  render: function() {
    $(this.el).html(this.template(this.model.toJSON()));
    return this;
  },
  
  on_click: function() {
    $(this.el).addClass('active').siblings().removeClass('active');
    google.maps.event.trigger(this.model.get('marker'), 'click');
  }
});