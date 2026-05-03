# Missing Persons & Re-Union Tracking System

A DBMS project built from the provided Student Management System interface, converted into a centralized Missing Persons & Re-Union Tracking System.

## Run the database
Open `database.sql` in MySQL Workbench and run the full script. It creates normalized tables, foreign keys, triggers, a stored procedure, and sample records.

## Configure the app
Copy `.env.example` to `.env` and set your Aiven password:

```
DB_HOST=kafka-32fd5d5-missingpersonandreuniontrackingsystem.j.aivencloud.com
DB_PORT=22043
DB_USER=avnadmin
DB_PASSWORD=your-password
DB_NAME=defaultdb
DB_SSL=true
```

## Start
```
npm install
npm start
```

Default logins after running `database.sql`:

- Admin: `admin` / `admin123`
- Agency: `agency` / `agency123`
- Sponsor: `sponsor` / `sponsor123`
