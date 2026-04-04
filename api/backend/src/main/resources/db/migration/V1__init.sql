create table users (
                       id bigserial primary key,
                       email varchar(255) not null unique,
                       password_hash varchar(255) not null
);

create table services (
                          id bigserial primary key,
                          name varchar(255) not null,
                          description text not null,
                          price numeric(12,2) not null
);

create table orders (
                        id bigserial primary key,
                        user_id bigint not null references users(id),
                        total numeric(12,2) not null,
                        created_at timestamp not null default now()
);

create table order_items (
                             id bigserial primary key,
                             order_id bigint not null references orders(id) on delete cascade,
                             service_id bigint not null references services(id),
                             qty int not null,
                             price numeric(12,2) not null
);

create index idx_orders_user_id on orders(user_id);
create index idx_order_items_order_id on order_items(order_id);