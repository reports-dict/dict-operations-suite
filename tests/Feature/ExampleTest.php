<?php

test('the root path redirects guests to login', function () {
    $response = $this->get('/');

    $response->assertRedirect('/modules');
    $this->get('/modules')->assertRedirect('/login');
});
