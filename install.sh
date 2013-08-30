#!/bin/bash

cd `dirname $0`/src

# install node_modules
npm install

# patch less module
patch -d node_modules/less/lib/less/ < ../less_parser.patch

# install ruby gems
gem update --system
gem install compass -v '= 0.12.2' -i rubygems
gem install sass -v '= 3.2.9' -i rubygems

exit 0
