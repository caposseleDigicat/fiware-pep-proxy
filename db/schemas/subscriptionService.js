/* Copyright (c) 2018 Digital Catapult
 *
 * This file belongs to the pep-proxy
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var subscriptionServiceSchema = new Schema({
    subscriptionId: {type: String, required: true},
    user: { type: String, required: true },
    authToken: { type: String, required: true },
    timestamp: { type: Date, default: Date.now() }
});

subscriptionServiceSchema.index({subscriptionId: 1, user: 1}, {unique: true});

module.exports = mongoose.model('subscriptionService', subscriptionServiceSchema);