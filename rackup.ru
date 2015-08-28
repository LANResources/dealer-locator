#!/usr/bin/env ruby

require 'rubygems'
require 'rack'

staticMe = Rack::Builder.new do
  run Rack::Directory.new( Dir.pwd )
end

Rack::Handler::Thin.run(staticMe, :port => 3002)
