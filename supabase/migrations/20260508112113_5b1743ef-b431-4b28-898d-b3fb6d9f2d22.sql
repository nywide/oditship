UPDATE public.livreur_workflows
SET steps = '[
  {"id":"6vi1zmoq","name":"Login Olivraison","type":"http","enabled":true,"on_error":"stop","retry":{"max_attempts":2,"backoff_ms":1000},
   "config":{"method":"POST","url":"https://partners.olivraison.com/auth/login","body_type":"json",
             "headers":{"Content-Type":"application/json"},
             "body":{"apiKey":"{{$secret.OLIVRAISON_API_KEY}}","secretKey":"{{$secret.OLIVRAISON_SECRET_KEY}}"}}},
  {"id":"swnfj2nz","name":"Stocker token","type":"set_variable","enabled":true,"on_error":"stop","retry":{},
   "config":{"values":{"token":"{{steps.6vi1zmoq.token}}"}}},
  {"id":"ol4irval","name":"Lister packages (GET /package)","type":"http","enabled":true,"on_error":"stop","retry":{"max_attempts":2,"backoff_ms":2000},
   "config":{"method":"GET","url":"https://partners.olivraison.com/package","body_type":"json","body":{},
             "headers":{"Authorization":"Bearer {{vars.token}}","Accept":"application/json"}}},
  {"id":"z25h0drk","name":"Stop si liste vide","type":"filter","enabled":true,"on_error":"stop","retry":{},
   "config":{"mode":"all","on_false":"stop","conditions":[{"left":"{{steps.ol4irval.data.0.trackingID}}","operator":"exists","right":""}]}},
  {"id":"k2pjhngy","name":"Pour chaque package","type":"for_each","enabled":true,"on_error":"continue","retry":{},
   "config":{"items":"{{steps.ol4irval.data}}","item_var":"item","index_var":"index","max_iterations":500,"on_iteration_error":"continue",
     "steps":[
       {"id":"0ycku0th","name":"Charger commande locale","type":"find_order","enabled":true,"on_error":"continue","retry":{"max_attempts":1,"backoff_ms":0},
        "config":{"field":"external_tracking_number","value":"{{item.trackingID}}","optional":true}},
       {"id":"14dgpsjm","name":"Skip si commande introuvable","type":"filter","enabled":true,"on_error":"stop","retry":{},
        "config":{"mode":"all","on_false":"stop","conditions":[{"left":"{{order.id}}","operator":"exists","right":""}]}},
       {"id":"detailshttp","name":"Détails package (GET /package/{trackingID})","type":"http","enabled":true,"on_error":"continue","retry":{"max_attempts":2,"backoff_ms":1000},
        "config":{"method":"GET","url":"https://partners.olivraison.com/package/{{item.trackingID}}","body_type":"json","body":{},
                  "headers":{"Authorization":"Bearer {{vars.token}}","Accept":"application/json"}}},
       {"id":"vrutnmo0","name":"Mapper statut Olivraison → local","type":"map_value","enabled":true,"on_error":"stop","retry":{},
        "config":{"value":"{{item.status}}","output_var":"local_status","default":"{{item.status}}",
                  "mapping":{"DELETED":"Annulé","ENROUTE":"En route","REFUSED":"Refusé","TRANSIT":"En transit","CANCELED":"Annulé","REPORTED":"Reporté","RETURNED":"Retourné","DELIVERED":"Livré","PICKUP":"Pickup","CONFIRMED":"Confirmé","scheduled":"Programmé","pending":"Crée","confirmed":"Confirmé","picked":"Pickup"}}},
       {"id":"cdr3n9ja","name":"Skip si statut inchangé","type":"filter","enabled":true,"on_error":"stop","retry":{},
        "config":{"mode":"all","on_false":"stop","conditions":[{"left":"{{order.status}}","operator":"neq","right":"{{vars.local_status}}"}]}},
       {"id":"7r3pzwlj","name":"Mettre à jour la commande","type":"update_order","enabled":true,"on_error":"continue","retry":{"max_attempts":2,"backoff_ms":500},
        "config":{"updates":{"status":"{{vars.local_status}}","status_note":"{{item.note}}",
                  "driver_name":"{{steps.detailshttp.transport.currentDriverName}}",
                  "driver_phone":"{{steps.detailshttp.transport.currentDriverPhone}}",
                  "external_tracking_number":"{{item.trackingID}}"}}},
       {"id":"x0rnhdgs","name":"Historique statut","type":"log_status","enabled":true,"on_error":"continue","retry":{},
        "config":{"new_status":"{{vars.local_status}}","note":"Polling Olivraison: {{item.status}} — {{item.note}}"}}
     ]}}
]'::jsonb
WHERE id = '75b8e311-371f-4d0a-903d-d07eb3f4838f';