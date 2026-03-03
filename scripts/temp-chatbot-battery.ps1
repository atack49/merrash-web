$cases = @(
    @{msg='hazme una agenda para mañana 3 pm'; expect='AGENDAR'},
    @{msg='me anotas una cita para masaje'; expect='AGENDAR'},
    @{msg='quiero apartar facial para el viernes'; expect='AGENDAR'},
    @{msg='sacame cita de homeopatia'; expect='AGENDAR'},
    @{msg='programame una sesion para el lunes'; expect='AGENDAR'},
    @{msg='quiero agendarme, soy Fer y mi correo fer@mail.com'; expect='AGENDAR'},
    @{msg='agenda para acupuntura pasado mañana 10 hrs'; expect='AGENDAR'},
    @{msg='quiero una cita'; expect='AGENDAR'},
    @{msg='me ayudas a reservar turno'; expect='AGENDAR'},
    @{msg='puedo agendar para hoy?'; expect='AGENDAR'},
    @{msg='hay horario el domingo a las 11?'; expect='AGENDAR'},
    @{msg='quiero cita de reiki el sabado 2 pm'; expect='AGENDAR'},
    @{msg='agendame para terapia neural'; expect='AGENDAR'},
    @{msg='me apuntas para sueroterapia'; expect='AGENDAR'},
    @{msg='anotame cita para rehabilitacion'; expect='AGENDAR'},
    @{msg='hazme una agenda: soy ana, 7221234567, ana@mail.com, masaje, martes 4 pm'; expect='CONFIRMAR'},
    @{msg='se puede apartar un espacio?'; expect='AGENDAR'},
    @{msg='quiero programar una consulta'; expect='AGENDAR'},
    @{msg='me gustaría agendar una sesion de healy'; expect='AGENDAR'},
    @{msg='quiero reagendar mi cita'; expect='REAGENDAR_CITA'},
    @{msg='hola'; expect='HABLAR'},
    @{msg='buenas tardes'; expect='HABLAR'},
    @{msg='que servicios tienen'; expect='HABLAR'},
    @{msg='recomiendame algo para estres'; expect='HABLAR'},
    @{msg='tengo ansiedad y duermo mal, que me recomiendas'; expect='HABLAR'},
    @{msg='para dolor de espalda que me conviene'; expect='HABLAR'},
    @{msg='donde estan ubicados'; expect='HABLAR'},
    @{msg='cual es su horario'; expect='HABLAR'},
    @{msg='cuanto cuesta reiki'; expect='HABLAR'},
    @{msg='que es sueroterapia'; expect='HABLAR'},
    @{msg='quiero saber de tratamientos faciales'; expect='HABLAR'},
    @{msg='me ayudas con informacion de acupuntura'; expect='HABLAR'},
    @{msg='tienen algo para energia baja'; expect='HABLAR'},
    @{msg='quiero mejorar mi piel'; expect='HABLAR'},
    @{msg='que me recomiendas para inflamacion'; expect='HABLAR'},
    @{msg='hacen masajes terapeuticos?'; expect='HABLAR'},
    @{msg='gracias'; expect='HABLAR'},
    @{msg='ok'; expect='HABLAR'},
    @{msg='quiero informacion'; expect='HABLAR'},
    @{msg='que onda'; expect='HABLAR'},
    @{msg='confirmo la cita'; expect='CONFIRMAR'},
    @{msg='si confirmo'; expect='CONFIRMAR'},
    @{msg='de acuerdo, confirmar'; expect='CONFIRMAR'},
    @{msg='ok confirmo ya'; expect='CONFIRMAR'},
    @{msg='va, confirmar'; expect='CONFIRMAR'},
    @{msg='agendar ya'; expect='CONFIRMAR'},
    @{msg='reservar ya'; expect='CONFIRMAR'},
    @{msg='si procede'; expect='CONFIRMAR'},
    @{msg='ya quedo, confirmo'; expect='CONFIRMAR'},
    @{msg='confirmar'; expect='CONFIRMAR'}
)

$results = @()
for ($i = 0; $i -lt $cases.Count; $i++) {
    $c = $cases[$i]
    $body = @{ message = $c.msg; conversationId = ('battery-' + $i + '-' + [guid]::NewGuid().ToString('N').Substring(0, 6)) } | ConvertTo-Json

    try {
        $r = Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/chatbot' -ContentType 'application/json' -Body $body -TimeoutSec 30
        $reply = [string]$r.reply
        $ruleOk = $true
        if ($c.msg -match 'domingo') {
            $ruleOk = ($reply -match 'cerrad|lunes|sábado|sabado')
        }

        $expectedIntents = @()
        if ($c.expect -is [System.Array]) {
            $expectedIntents = $c.expect
        }
        else {
            $expectedIntents = @($c.expect)
        }

        $intentOk = $expectedIntents -contains $r.intent

        $results += [pscustomobject]@{
            idx      = $i + 1
            expect   = $c.expect
            got      = $r.intent
            intentOk = $intentOk
            ruleOk   = $ruleOk
            ok       = ($intentOk -and $ruleOk)
            msg      = $c.msg
            reply    = ($reply -replace "`r?`n", ' | ')
        }
    }
    catch {
        $results += [pscustomobject]@{
            idx      = $i + 1
            expect   = $c.expect
            got      = 'ERROR'
            intentOk = $false
            ruleOk   = $false
            ok       = $false
            msg      = $c.msg
            reply    = $_.Exception.Message
        }
    }
}

$total = $results.Count
$passed = ($results | Where-Object { $_.ok }).Count
$intentPassed = ($results | Where-Object { $_.intentOk }).Count
$rulePassed = ($results | Where-Object { $_.ruleOk }).Count
$failed = $results | Where-Object { -not $_.ok } | Select-Object -First 15

$summary = [pscustomobject]@{
    total          = $total
    passed         = $passed
    accuracy       = [math]::Round(($passed * 100.0) / $total, 2)
    intentPassed   = $intentPassed
    intentAccuracy = [math]::Round(($intentPassed * 100.0) / $total, 2)
    rulePassed     = $rulePassed
    ruleAccuracy   = [math]::Round(($rulePassed * 100.0) / $total, 2)
    failedSample   = $failed
}

$json = $summary | ConvertTo-Json -Depth 8
$outFile = Join-Path (Get-Location) 'data\chatbot-battery-result.json'
$json | Out-File -FilePath $outFile -Encoding utf8
$json
