window.Dealer = Backbone.Model.extend({
  initialize: function() {
    _.bindAll(this, 'place', 'showDetails');
    this.bind('change:map', this.place);

    this.set({
      latlng: new google.maps.LatLng(this.get('latitude'), this.get('longitude'))
    });
  }
});

window.Dealers = Backbone.Collection.extend({
    model: Dealer,
    url: 'http://localhost:3000/dealers.json'
    // url: 'http://www.biozymebackoffice.com/dealers.json'
});
