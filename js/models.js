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
    url: 'https://www.biozymebackoffice.com/dealers.json'
});
