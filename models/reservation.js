"use strict";

/** Reservation for Lunchly */

const moment = require("moment");

const db = require("../db");
const { BadRequestError } = require("../expressError");

/** A reservation for a party */

class Reservation {
  constructor({ id, customerId, numGuests, startAt, notes }) {
    this.id = id;
    this.customerId = customerId;
    this.numGuests = numGuests;
    this.startAt = startAt;
    this.notes = notes;
  }

  get customerId() {
    return this._customerId;
  }

  set customerId(val) {
    if (this._customerId) throw new BadRequestError("Cannot reassign customer id.");

    this._customerId = val;
  }

  get notes() {
    return this._notes;
  }

  set notes(val) {
    this._notes = val ? val : "";
  }

  get numGuests() {
    return this._numGuests;
  }

  set numGuests(val) {
    if (val < 1) throw new BadRequestError("Must have atleast one guest for reservation.");

    this._numGuests = val;
  }

  get startAt() {
    return this._startAt;
  }

  set startAt(val) {
    const date = new Date(val);

    if (date.toString() === "Invalid Date") {
      throw new BadRequestError("Invalid date.");
    }

    this._startAt = date;
  }

  /** formatter for startAt */

  getFormattedStartAt() {
    return moment(this.startAt).format("MMMM Do YYYY, h:mm a");
  }

  /** given a customer id, find their reservations. */

  static async getReservationsForCustomer(customerId) {
    const results = await db.query(
      `SELECT id,
                  customer_id AS "customerId",
                  num_guests AS "numGuests",
                  start_at AS "startAt",
                  notes AS "notes"
           FROM reservations
           WHERE customer_id = $1`,
      [customerId],
    );

    return results.rows.map(row => new Reservation(row));
  }

  /** save this reservation. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO reservations (customer_id, start_at, num_guests, notes)
               VALUES ($1, $2, $3, $4)
               RETURNING id`,
        [this.customerId, this.startAt, this.numGuests, this.notes],
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE reservations
               SET start_at=$1,
               num_guests=$2,
                   notes=$3
               WHERE id = $4`, [
        this.startAt,
        this.numGuests,
        this.notes,
        this.id,
      ],
      );
    }
  }
  static async get(id) {
    const results = await db.query(
      `SELECT id,
                  customer_id AS "customerId",
                  start_at AS "startAt",
                  num_guests AS "numGuests",
                  notes
           FROM reservations
           WHERE id = $1`,
      [id],
    );
    const reservation = results.rows[0];

    if (reservation === undefined) {
      const err = new Error(`No such reservation: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Reservation(reservation);
  }

}


module.exports = Reservation;
