$baseCases = @(
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

$extraCases = @(
    @{msg='agendame una sita para el martes'; expect='AGENDAR'},
    @{msg='kiero una cita para masaje'; expect='AGENDAR'},
    @{msg='me podrias apartar para diciembre?'; expect='AGENDAR'},
    @{msg='quiero reservar para 15/12 a las 2pm'; expect='AGENDAR'},
    @{msg='puedo apartar un espacio en diciembre'; expect='AGENDAR'},
    @{msg='agnda para acupuntura'; expect='AGENDAR'},
    @{msg='me agenda una sesion porfa'; expect='AGENDAR'},
    @{msg='turno para homeopatia'; expect='AGENDAR'},
    @{msg='quiero hora para reiki'; expect='AGENDAR'},
    @{msg='hay espacio manana a las 3'; expect='AGENDAR'},
    @{msg='hay disponibilidad viernes 11 am'; expect=@('AGENDAR','CONSULTAR_DISPONIBILIDAD')},
    @{msg='domingo atienden?'; expect=@('AGENDAR','CONSULTAR_DISPONIBILIDAD')},
    @{msg='quiero reagendar al jueves'; expect='REAGENDAR_CITA'},
    @{msg='cancelar mi cita'; expect='CANCELAR_CITA'},
    @{msg='necesito mover mi cita'; expect='REAGENDAR_CITA'},
    @{msg='quiero cambiar la hora'; expect='REAGENDAR_CITA'},
    @{msg='recomiendame algo para ansiedad'; expect='HABLAR'},
    @{msg='que recomiendas para dolor lumbar'; expect='HABLAR'},
    @{msg='algo para energia baja'; expect='HABLAR'},
    @{msg='que me sugieres para piel'; expect='HABLAR'},
    @{msg='que servicios nuevos tienen'; expect='HABLAR'},
    @{msg='que incluyen los faciales'; expect='HABLAR'},
    @{msg='me das su dirección exacta'; expect='HABLAR'},
    @{msg='a que hora abren hoy'; expect='HABLAR'},
    @{msg='atienden sabado'; expect='HABLAR'},
    @{msg='cuanto cuesta un masaje'; expect='HABLAR'},
    @{msg='quiero saber precios'; expect='HABLAR'},
    @{msg='me pasas info de servicios'; expect='HABLAR'},
    @{msg='que hacen en merrash'; expect='HABLAR'},
    @{msg='hola buenas'; expect='HABLAR'},
    @{msg='si, confirmo'; expect='CONFIRMAR'},
    @{msg='confirmo, adelante'; expect='CONFIRMAR'},
    @{msg='quiero confirmar'; expect='CONFIRMAR'},
    @{msg='confirmacion de cita'; expect='CONFIRMAR'},
    @{msg='ya confirmo'; expect='CONFIRMAR'},
    @{msg='ok confirmar'; expect='CONFIRMAR'},
    @{msg='dale, confirmar'; expect='CONFIRMAR'},
    @{msg='perfecto, confirmo'; expect='CONFIRMAR'},
    @{msg='confirmar cita'; expect='CONFIRMAR'},
    @{msg='necesito confirmar mi reserva'; expect='CONFIRMAR'},
    @{msg='quiero agendar facial para 2026-12-10 14:00'; expect='AGENDAR'},
    @{msg='me anotas para 10/12 2 pm'; expect='AGENDAR'},
    @{msg='apartame para el 10 de diciembre'; expect='AGENDAR'},
    @{msg='quiero servicio de healy en diciembre'; expect='AGENDAR'},
    @{msg='puedo ir el sabado a las 15:00'; expect='AGENDAR'},
    @{msg='agendar para domingo 12:00'; expect='AGENDAR'},
    @{msg='quiero mi cita pero no se que servicio'; expect='AGENDAR'},
    @{msg='quiero una cita para mi mama'; expect='AGENDAR'},
    @{msg='me ayudas con una reservación'; expect='AGENDAR'},
    @{msg='agenda express por favor'; expect='AGENDAR'}
)

$cases = @()
$cases += $baseCases
$cases += $extraCases

$results = @()
for ($i = 0; $i -lt $cases.Count; $i++) {
    $c = $cases[$i]
    $body = @{ message = $c.msg; conversationId = ('battery100-' + $i + '-' + [guid]::NewGuid().ToString('N').Substring(0, 6)) } | ConvertTo-Json

    try {
        $r = Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/chatbot' -ContentType 'application/json' -Body $body -TimeoutSec 30
        $reply = [string]$r.reply

        $expectedIntents = @()
        if ($c.expect -is [System.Array]) {
            $expectedIntents = $c.expect
        }
        else {
            $expectedIntents = @($c.expect)
        }

        $intentOk = $expectedIntents -contains $r.intent

        $ruleOk = $true
        if ($c.msg -match 'domingo') {
            $ruleOk = ($reply -match 'cerrad|lunes|sabado|sábado|10:00|16:00')
        }

        $results += [pscustomobject]@{
            idx      = $i + 1
            expect   = ($expectedIntents -join '|')
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
$failed = $results | Where-Object { -not $_.ok } | Select-Object -First 25

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
$outFile = Join-Path (Get-Location) 'data\chatbot-battery-100-result.json'
$json | Out-File -FilePath $outFile -Encoding utf8
$json
