window.MapView = Backbone.View.extend({
  tagName: 'section',
  className: 'map-container',
  
  options: {
    center: new google.maps.LatLng(39.715005, -94.877796),
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    zoom: 16,
    maxZoom: 16
  },
  
  initialize: function() {
    _.bindAll(this, 'render', 'update_map', 'place_marker',
                    'close_overlays', 'remove_markers');
    this.template = _.template($('#map-template').html());
    Results.bind('reset', this.update_map);
  },
  
  render: function() {
    $(this.el).html(this.template({}));
    this.map = new google.maps.Map(this.$('#map').get(0), this.options);
    this.markers = new Array;
    return this;
  },
  
  update_map: function() {
    var self = this;
    var latlngbounds = new google.maps.LatLngBounds();
    
    self.remove_markers();
    
    Results.each(function(dealer) {
      latlngbounds.extend(dealer.get('latlng'));
      self.place_marker(dealer);
    });
    
    self.map.fitBounds(latlngbounds);
  },
  
  place_marker: function(dealer) {
    var self = this;
    
    var marker = new google.maps.Marker({
      position: dealer.get('latlng'),
      title: dealer.get('name'),
      map: self.map,
      infoWindow: new google.maps.InfoWindow({
        content: new DealerView({ model: dealer }).render().el
      })
    });
    
    google.maps.event.addListener(marker, 'click', function() {
      self.close_overlays();
      self.open_overlay = marker.infoWindow;
      self.open_overlay.open(self.map, marker);
    });
    
    self.markers.push(marker);
    dealer.set({ marker: marker });
  },
  
  close_overlays: function() {
    if (this.open_overlay != undefined) {
      this.open_overlay.close();
    }
  },
  
  remove_markers: function() {
    _.each(this.markers, function(marker){
      marker.setMap(null);
    });
  }
});