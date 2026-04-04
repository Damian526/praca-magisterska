INSERT INTO users (email, password_hash)
VALUES ('test@test.com', 'HASH_TUTAJ');

INSERT INTO services (name, description, price)
SELECT
    'Usługa ' || i,
    'Opis usługi ' || i,
    (49.99 + i)::numeric(12,2)
FROM generate_series(1, 100) AS s(i);