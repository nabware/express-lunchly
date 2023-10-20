"use strict";

/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, middleName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.middleName = middleName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }

  get notes() {
    return this._notes;
  }

  set notes(val) {
    this._notes = val ? val : "";
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  middle_name AS "middleName",
                  phone,
                  notes
           FROM customers
           ORDER BY last_name, first_name`,
    );
    const customers = results.rows.map(c => new Customer(c));

    for (const customer of customers) {
      customer.reservations = await customer.getReservations();
    }

    return customers;
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  middle_name AS "middleName",
                  phone,
                  notes
           FROM customers
           WHERE id = $1`,
      [id],
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** find all customers by search term. */

  static async search(searchTerm) {
    const results = await db.query(
      `SELECT id,
              first_name AS "firstName",
              last_name  AS "lastName",
              middle_name AS "middleName",
              phone,
              notes
      FROM customers
      WHERE
      first_name ILIKE $1  OR
      last_name ILIKE $1
      ORDER BY last_name, first_name`, [`%${searchTerm}%`]
    );//Can use concat between first_name and last_name with ' ' between

    const customers = results.rows.map(c => new Customer(c));

    for (const customer of customers) {
      customer.reservations = await customer.getReservations();
    }

    return customers;
  }

  /** get top 10 customers who have the most reservations */

  static async getTopTen() {
    const results = await db.query(
      `SELECT customers.id,
            first_name AS "firstName",
            last_name  AS "lastName",
            middle_name AS "middleName",
            phone,
            customers.notes,
            COUNT(*)
      FROM customers
      JOIN reservations ON (customers.id = reservations.customer_id)
      GROUP BY customers.id
      ORDER BY COUNT(*) DESC
      LIMIT 10`
    );

    return results.rows.map(c => new Customer(c));
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes, middle_name)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes, this.middleName],
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers
             SET first_name=$1,
                 last_name=$2,
                 phone=$3,
                 notes=$4,
                 middle_name=$5
             WHERE id = $6`, [
        this.firstName,
        this.lastName,
        this.phone,
        this.notes,
        this.middleName,
        this.id,
      ],
      );
    }
  }

  /** Returns full name */

  get fullName() {
    return this.firstName + ' ' + this.middleName + ' ' + this.lastName;
  }
}

module.exports = Customer;
