// Mixins
////////////////////////////////////////
  var FilterableCollectionMixin = {
    filtered: function(criteriaFunction) {
      return new this.constructor(this.select(criteriaFunction));
    },

    sortedBy: function(comparator) {
      var sortedCollection = new this.constructor(this.models);
      sortedCollection.comparator = comparator;
      sortedCollection.sort();
      return sortedCollection;
    }
  };

  if (typeof(Number.prototype.toRad) === "undefined") {
    Number.prototype.toRad = function() {
      return this * Math.PI / 180;
    }
  }

  var DistanceMixin = {
    earth_radius: 6371, //earth radius in km

    distance_between: function(lat1, lng1, lat2, lng2) {
      lat1 = new Number(lat1).toRad(); lng1 = new Number(lng1).toRad();
      lat2 = new Number(lat2).toRad(); lng2 = new Number(lng2).toRad();

      var x = (lng2-lng1) * Math.cos((lat1+lat2)/2),
          y = (lat2-lat1);

      return Math.sqrt(x*x + y*y) * this.earth_radius;
    }
  };


// Models
////////////////////////////////////////
  var User = Backbone.Model.extend({
    url: 'http://freegeoip.net/json/?callback=?',

    current_location: function() {
      return new google.maps.LatLng(this.get('latitude'), this.get('longitude'));
    }

  });
  window.current_user = new User();

  var Dealer = Backbone.Model.extend(_.extend({
    initialize: function() {
      var lat = this.get('latitude'),
          lng = this.get('longitude');

      this.set({
        latlng: new google.maps.LatLng(lat, lng),
        distance: null,
        search_distance: null,
        product_lines: _.intersect(['DuraFerm®', 'Gain Smart®', 'Sure Champ®', 'Vita Charge®', 'VitaFerm®', 'Vitalize®'], this.get('dealer_types'))
      });
    },

    set_search_distance_from: function(lat, lng) {
      this.set({ search_distance: this.distance_from(lat, lng) });
    },

    set_distance_from: function(lat, lng) {
      this.set({ distance: this.distance_from(lat, lng) });
    },

    distance_from: function(lat, lng) {
      return this.distance_between(this.get('latitude'), this.get('longitude'), lat, lng);
    },

    is_type: function(types) {
      return _.intersect(types, this.get('dealer_types')).length > 0;
    },

    is_near: function(lat, lng) {
      //160km ~ 100mi
      return  this.distance_from(lat, lng) <= 160;
    },

    is_in_bounds: function(bounds) {
      return bounds.contains(this.get('latlng'));
    },

    marker_icon: function() {
      if (this.get('master_dealer') == true){
        return '/images/master_dealer_marker.png';
      }else if (this.get('contact_type') == 'Dealer SPA'){
        return '/images/dealer_spa_marker.png';
      }else{
        return '/images/sure_champ_marker.png';
      }
    }
  }, DistanceMixin));

  var Asm = Backbone.Model.extend({
    url: 'https://www.biozymebackoffice.com/asms.js?callback=?',

    set_photo_url: function(){
      this.set({
        photo_url: this.get('thumb_url')
      });
    },

    initialize: function(attributes) {
      _.bindAll(this, 'set_photo_url');
      this.bind('change', this.set_photo_url);
    },

    search: function(lat, lng) {
      query = ''+lat+'%2C'+lng;
      this.fetch({data: 'q=' + query});
    }
  });
  window.asm = new Asm();

// Collections
////////////////////////////////////////
  var Dealers = Backbone.Collection.extend(_.extend({
      model: Dealer,
      url: 'https://www.biozymebackoffice.com/dealers.js?callback=?',

      product_lines: ['DuraFerm®', 'Gain Smart®', 'Sure Champ®', 'Vita Charge®', 'VitaFerm®', 'Vitalize®'],
      bounds: null,
      filter_cache: null,

      initialize: function() {
        _.bindAll(this, 'set_product_lines_filter', 'set_bounds', 'results',
                        'product_line_results', 'clear_cache');
        this.bind('filtered', this.clear_cache, this);
      },

      parse: function(response) {
        result = [];
        _.each(response, function(dealer){
          _.each(_.filter(dealer.addresses, function(address){ return (address.show_on_locator == true); }), function(address){
            new_dealer = _.clone(dealer);
            new_dealer.id = [new_dealer.id, address.id].join('-');
            new_dealer.address = address.line_1;
            new_dealer.address_2 = address.line_2;
            new_dealer.city = address.city;
            new_dealer.state = address.state;
            new_dealer.zipcode = address.zipcode;
            new_dealer.phone = address.phone;
            new_dealer.fax = address.fax;
            new_dealer.latitude = address.latitude;
            new_dealer.longitude = address.longitude;
            if (address.label != 'Primary'){
              if (address.ship_to_name){
                new_dealer.name = address.ship_to_name;
              }
              new_dealer.email = null;
            }
            if (address.email != null){
              new_dealer.email = address.email
            }
            new_dealer.email = (new_dealer.email || "").split(';');
            result.push(new_dealer);
          });
        });
        return result;
      },

      set_product_lines_filter: function(filters) {
        this.product_lines = filters;
        this.trigger('filtered');
        this.trigger('product-line-filtered');
      },

      set_bounds: function(bounds) {
        if (this.bounds == null || !this.bounds.equals(bounds)) {
          this.bounds = bounds;
          this.trigger('filtered');
        }
      },

      comparator: function(dealer) {
        return dealer.get('distance');
      },

      clear_cache: function() {
        this.filter_cache = null;
      },

      results: function(center) {
        // if (this.filter_cache !== null) {
        //   return this.filter_cache;
        // }

        var bounds = this.bounds,
            pls = this.product_lines;

        this.filter_cache = this.filtered(function(dealer) {
          dealer.set_distance_from(center.lat(), center.lng());
          if (window.search_location == null){
            dealer.set_search_distance_from(center.lat(), center.lng());
          }else{
            dealer.set_search_distance_from(window.search_location.lat(), window.search_location.lng());
          }
          return (dealer.is_in_bounds(bounds) && dealer.is_type(pls));
        });

        return this.filter_cache;
      },

      product_line_results: function() {
        var pls = this.product_lines;

        return this.filtered(function(dealer) {
          return dealer.is_type(pls);
        });
      }
  }, FilterableCollectionMixin));
  window.dealers = new Dealers();

// Views
////////////////////////////////////////
  var DealerView = Backbone.View.extend({
    template: '#dealer-template',
    className: 'dealer',

    initialize: function(options) {
      this.template = _.template($(this.template).html());
    },

    render: function() {
      $(this.el).html(this.template(this.model.toJSON()));
      return this;
    }
  });

  var ResultView = DealerView.extend({
    tagName: 'li',
    events: { 'click': 'on_click' },

    on_click: function() {
      $(this.el).addClass('active').siblings().removeClass('active');
      google.maps.event.trigger(this.model.get('marker'), 'click');
    }
  });

  var AsmView = DealerView.extend({
    template: '#asm-template',
    tagName: 'li',
    className: 'asm'
  });


  var ResultsView = Backbone.View.extend({
    tagName: 'ul',
    className: 'dealers',

    initialize: function(options) {
      _.bindAll(this, 'update_results', 'update_asm');

      this.asm = this.options.asm;

      this.collection.bind('reset', this.update_results, this);
      this.collection.bind('filtered', this.update_results, this);
      this.asm.bind('change', this.update_asm, this);
    },

    update_results: function() {
      this.$('.dealer').remove(); //clear results

      var bounds = this.collection.bounds;
      if (!bounds) return;

      var center = this.collection.bounds.getCenter(),
          results = this.collection.results(center),
          $dealers = $(this.el);

      if (results.length > 0) {
        results.each(function(dealer) {
          var view = new ResultView({ model: dealer, center: center });
          $dealers.append(view.render().el);
        });
      } else {
        $dealers.append('<li class="dealer">There is no dealer in the selected area.  Please try zooming the map out.  You can also call our inside sales team at 816-238-7084 or purchase products online by following <a href="http://www.biozymeproducts.com/Default.asp">this link</a></li>');
      }
    },

    update_asm: function() {
      this.$('.asm').remove();
      var view = new AsmView({ model: this.asm });
      $(this.el).prepend(view.render().el);
    }
  });

  var MapView = Backbone.View.extend({
    tagName: 'div',
    className: 'map',

    map_options: {
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      zoom: 8,
      maxZoom: 16,
      scrollwheel: false
    },

    initialize: function(options) {
      _.bindAll(this, 'place_markers', 'update_markers', 'center_on');
      this.asm = this.options.asm;

      this.map_options.center = this.options.center

      this.collection.bind('reset', this.place_markers, this);
      this.collection.bind('reset', this.update_markers, this);
      this.collection.bind('product-line-filtered', this.update_markers, this);
    },

    render: function() {
      var map = new google.maps.Map(this.el, this.map_options),
          asm = this.asm,
          dealers = this.collection;

      this.map = map;

      google.maps.event.addListener(map, 'idle', function() {
        var location = map.getCenter();

        dealers.set_bounds(map.getBounds());
        asm.search(location.lat(), location.lng());
      });

      google.maps.event.addListenerOnce(map, 'center_changed', function() {
        google.maps.event.trigger(map, 'idle');
      });

      return this;
    },

    place_markers: function() {
      var self = this;

      this.collection.each(function(dealer) {
        var marker  = self.make_marker(dealer, self.map),
            view    = new DealerView({ model: dealer }).render().el,
            window  = new google.maps.InfoWindow({ content: view });

        marker.setMap(self.map);
        google.maps.event.addListener(marker, 'click', function() {
          if (typeof self.map.open_window != 'undefined') {
            self.map.open_window.close();
          }
          self.map.open_window = window;
          window.open(self.map, marker);
        });

        dealer.set({marker: marker});
      });
    },

    make_marker: function(dealer) {
      return new google.maps.Marker({
        position:   dealer.get('latlng'),
        title:      dealer.get('name'),
        icon:       dealer.marker_icon()
      });
    },

    update_markers: function() {
      var filtered = this.collection.product_line_results();

      this.collection.each(function(dealer) {
        dealer.get('marker').setVisible(false);
      });

      filtered.each(function(dealer) {
        dealer.get('marker').setVisible(true);
      });
    },

    center_on: function(lat, lng) {
      var new_center = new google.maps.LatLng(lat, lng);
      this.map.setCenter(new_center);
      this.map.setZoom(10);
    }
  });


// Routers
////////////////////////////////////////
  var DealerLocator = Backbone.Router.extend({
    routes: {
      '': 'home',
      'search': 'search'
    },

    initialize: function() {

      this.resultsView = new ResultsView({
        collection: window.dealers,
        asm: window.asm
      });

      this.mapView = new MapView({
        collection: window.dealers,
        asm: window.asm,
        center: new google.maps.LatLng(39.715005, -94.877796) //HQ
      });
    },

    home: function() {
      $('#body').empty()
        .append(this.mapView.render().el)
        .append(this.resultsView.render().el);
    },

    search: function() {

    }
  });

// Bootstraping
////////////////////////////////////////
  $(document).ready(function() {
    window.app = new DealerLocator();
    Backbone.history.start();

    window.dealers.fetch();

    window.current_user.fetch({
      success: function(resp, status, xhr) {
        window.app.navigate('', true);
        if ($('input#near').val().length == 0){
          window.app.mapView.center_on(window.current_user.get('latitude'), window.current_user.get('longitude'));
        }
      },

      error: function() {
        window.app.navigate('', true);
      }
    });

    if ("geolocation" in window.navigator){
      window.navigator.geolocation.getCurrentPosition(function(position){
        if ($('input#near').val().length == 0){
          window.app.mapView.center_on(position.coords.latitude, position.coords.longitude);
        }
      });
    }
  });
