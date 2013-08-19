window.ResultsView = Backbone.View.extend({
  tagName: 'section',
  className: 'results',
  events: { 'submit form': 'search' },
  
  initialize: function() {
    _.bindAll(this, 'render', 'show_results', 'search');
    this.template = _.template($('#results-template').html());
    Results.bind('reset', this.show_results);
  },
  
  render: function() {
    var $dealers;
    var view = this;
        
    $(this.el).html(this.template({}));
    var query_box = this.$('#near').get(0);
    new google.maps.places.Autocomplete(query_box, { types: ['geocode'] })
    
    return this;
  },
  
  show_results: function() {
    $dealers = this.$('.dealers');
    $dealers.html('');
    
    Results.each(function(dealer) {
      var view = new ResultView({ model: dealer });
      $dealers.append(view.render().el);
    });
  },
  
  search: function(e) {
    var query = this.$('#near').val();
    Results.fetch({data: 'q=' + query});
    return false;
  }
});