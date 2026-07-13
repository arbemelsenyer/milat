alter table public.case_parties disable trigger trg_case_parties_self_update_guard;

update public.case_parties
set user_id = (select id from auth.users where email = 'emelsenyer@milatmediation.com'),
    invite_status = 'accepted'
where id = 'ae72e5d0-4dbb-4844-8700-c404b96516c6';

alter table public.case_parties enable trigger trg_case_parties_self_update_guard;