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

var logServiceSchema = new Schema({
    ip: {type: String, required: true},
    method: {type: String, required: true},
    url: {type: String, required: true},
    requestHeaders : {type: String, required: true},
    requestBody : {type: String, required: false},
    requestTimestamp : { type: Date, default: Date.now() },
    responseStatus : {type: String, required: true},
    responseHeaders: {type: String, required: false},
    responseBody: {type: String, required: false},
    //user: { type: String, required: true },
    //authToken: { type: String, required: true },
    responseTimestamp: { type: Date, default: Date.now() }
});

logServiceSchema.index({requestTimestamp: 1, ip: 1}, {unique: true});

module.exports = mongoose.model('logService', logServiceSchema);