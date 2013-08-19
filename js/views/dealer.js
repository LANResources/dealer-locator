window.DealerView = Backbone.View.extend({
  template: '#dealer-template',
  className: 'dealer',
  
  initialize: function() {
    _.bindAll(this, 'render');
    this.initializeTemplate();
  },
  
  initializeTemplate: function() {
    this.template = _.template($(this.template).html());
  },
  
  render: function() {
    $(this.el).html(this.template(this.model.toJSON()));
    return this;
  }
});