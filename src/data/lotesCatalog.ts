import { LoteItem } from '../types';

// Tab-separated raw dataset provided by the user
const RAW_LOTES_TSV = `Fundo	Modulo	Turno	Lote
Arena Azul	M01	T01	L39
Arena Azul	M01	T02	L57
Arena Azul	M01	T02	L58
Arena Azul	M01	T03	L51
Arena Azul	M01	T03	L52
Arena Azul	M01	T04	L45
Arena Azul	M01	T04	L46
Arena Azul	M01	T05	L44
Arena Azul	M01	T05	L47
Arena Azul	M01	T06	L50
Arena Azul	M01	T06	L53
Arena Azul	M01	T07	L56
Arena Azul	M01	T07	L59
Arena Azul	M01	T08	L55
Arena Azul	M01	T08	L60
Arena Azul	M01	T09	L49
Arena Azul	M01	T09	L54
Arena Azul	M01	T10	L43
Arena Azul	M01	T10	L48
Arena Azul	M02	T01	L19
Arena Azul	M02	T01	L20
Arena Azul	M02	T01	L26
Arena Azul	M02	T02	L27
Arena Azul	M02	T02	L34
Arena Azul	M02	T03	L35
Arena Azul	M02	T03	L42
Arena Azul	M02	T04	L36
Arena Azul	M02	T04	L41
Arena Azul	M02	T05	L28
Arena Azul	M02	T05	L33
Arena Azul	M02	T06	L24
Arena Azul	M02	T06	L25
Arena Azul	M02	T07	L29
Arena Azul	M02	T07	L32
Arena Azul	M02	T08	L37
Arena Azul	M02	T08	L40
Arena Azul	M02	T09	L31
Arena Azul	M02	T09	L38
Arena Azul	M02	T10	L23
Arena Azul	M02	T10	L30
Arena Azul	M03	T01	L1
Arena Azul	M03	T01	L6
Arena Azul	M03	T02	L2
Arena Azul	M03	T02	L5
Arena Azul	M03	T03	L3
Arena Azul	M03	T03	L4
Arena Azul	M03	T04	L9
Arena Azul	M03	T04	L10
Arena Azul	M03	T05	L8
Arena Azul	M03	T05	L11
Arena Azul	M03	T06	L7
Arena Azul	M03	T06	L12
Arena Azul	M03	T07	L13
Arena Azul	M03	T07	L18
Arena Azul	M03	T08	L14
Arena Azul	M03	T08	L17
Arena Azul	M03	T09	L15
Arena Azul	M03	T09	L16
Arena Azul	M03	T10	L21
Arena Azul	M03	T10	L22
Arena Azul	M04	T01	L75
Arena Azul	M04	T01	L76
Arena Azul	M04	T02	L73
Arena Azul	M04	T02	L74
Arena Azul	M04	T02	L78
Arena Azul	M04	T02	L79
Arena Azul	M04	T03	L67
Arena Azul	M04	T03	L68
Arena Azul	M04	T03	L77
Arena Azul	M04	T04	L69
Arena Azul	M04	T04	L70
Arena Azul	M04	T05	L71
Arena Azul	M04	T05	L72
Arena Azul	M04	T06	L63
Arena Azul	M04	T06	L64
Arena Azul	M04	T07	L62
Arena Azul	M04	T07	L65
Arena Azul	M04	T08	L61
Arena Azul	M04	T08	L66
Arena Azul	M04	T09	L87
Arena Azul	M04	T09	L88
Arena Azul	M04	T10	L85
Arena Azul	M04	T10	L86
Arena Azul	M04	T11	L81
Arena Azul	M04	T11	L82
Arena Azul	M04	T12	L83
Arena Azul	M04	T12	L84
Vivadis	M01	T01	L1
Vivadis	M01	T01	L2
Vivadis	M01	T01	L3
Vivadis	M01	T01	L4
Vivadis	M01	T02	L5
Vivadis	M01	T02	L6
Vivadis	M01	T02	L7
Vivadis	M01	T03	L8
Vivadis	M01	T03	L9
Vivadis	M01	T03	L10
Vivadis	M01	T04	L11
Vivadis	M01	T04	L12
Vivadis	M01	T04	L13
Vivadis	M01	T05	L14
Vivadis	M01	T05	L15
Vivadis	M01	T05	L16
Vivadis	M01	T05	L17
Vivadis	M01	T05	L18
Vivadis	M01	T05	L19
Vivadis	M01	T05	L20
Vivadis	M01	T06	L21
Vivadis	M01	T06	L22
Vivadis	M01	T06	L23
Vivadis	M01	T07	L24
Vivadis	M01	T07	L25
Vivadis	M01	T07	L26
Vivadis	M01	T08	L27
Vivadis	M01	T08	L28
Vivadis	M01	T08	L29
Vivadis	M01	T09	L30
Vivadis	M01	T09	L31
Vivadis	M01	T09	L32
Vivadis	M01	T10	L33
Vivadis	M01	T10	L34
Vivadis	M01	T10	L35
Vivadis	M01	T10	L36
Vivadis	M02	T01	L37
Vivadis	M02	T01	L38
Vivadis	M02	T01	L39
Vivadis	M02	T02	L40
Vivadis	M02	T02	L41
Vivadis	M02	T02	L42
Vivadis	M02	T03	L43
Vivadis	M02	T03	L44
Vivadis	M02	T03	L45
Vivadis	M02	T04	L46
Vivadis	M02	T04	L47
Vivadis	M02	T04	L48
Vivadis	M02	T05	L49
Vivadis	M02	T05	L50
Vivadis	M02	T05	L51
Vivadis	M02	T06	L52
Vivadis	M02	T06	L53
Vivadis	M02	T06	L54
Vivadis	M02	T07	L55
Vivadis	M02	T07	L56
Vivadis	M02	T07	L57
Vivadis	M02	T08	L58
Vivadis	M02	T08	L59
Vivadis	M02	T08	L60
Vivadis	M02	T08	L61
Vivadis	M02	T08	L62
Vivadis	M02	T09	L63
Vivadis	M02	T09	L64
Vivadis	M02	T09	L65
Vivadis	M02	T10	L66
Vivadis	M02	T10	L67
Vivadis	M02	T10	L68
Vivadis	M03	T01	L72
Vivadis	M03	T01	L73
Vivadis	M03	T01	L74
Vivadis	M03	T02	L75
Vivadis	M03	T02	L76
Vivadis	M03	T02	L77
Vivadis	M03	T03	L78
Vivadis	M03	T03	L79
Vivadis	M03	T03	L80
Vivadis	M03	T03	L81
Vivadis	M03	T04	L82
Vivadis	M03	T04	L83
Vivadis	M03	T04	L84
Vivadis	M03	T04	L85
Vivadis	M03	T05	L86
Vivadis	M03	T05	L87
Vivadis	M03	T05	L88
Vivadis	M03	T05	L89
Vivadis	M03	T06	L90
Vivadis	M03	T06	L91
Vivadis	M03	T06	L92
Vivadis	M03	T06	L93
Vivadis	M03	T07	L94
Vivadis	M03	T07	L95
Vivadis	M03	T07	L96
Vivadis	M03	T07	L97
Vivadis	M03	T08	L98
Vivadis	M03	T08	L99
Vivadis	M03	T08	L100
Vivadis	M03	T09	L101
Vivadis	M03	T09	L102
Vivadis	M03	T09	L103
Vivadis	M03	T10	L104
Vivadis	M03	T10	L105
Vivadis	M03	T10	L106
Vivadis	M04	T01	L107
Vivadis	M04	T01	L108
Vivadis	M04	T01	L109
Vivadis	M04	T02	L110
Vivadis	M04	T02	L111
Vivadis	M04	T02	L112
Vivadis	M04	T03	L113
Vivadis	M04	T03	L114
Vivadis	M04	T03	L115
Vivadis	M04	T03	L116
Vivadis	M04	T04	L117
Vivadis	M04	T04	L118
Vivadis	M04	T04	L119
Vivadis	M04	T04	L120
Vivadis	M04	T05	L121
Vivadis	M04	T05	L122
Vivadis	M04	T05	L123
Vivadis	M04	T05	L124
Vivadis	M04	T06	L125
Vivadis	M04	T06	L126
Vivadis	M04	T06	L127
Vivadis	M04	T06	L128
Vivadis	M04	T07	L129
Vivadis	M04	T07	L130
Vivadis	M04	T07	L131
Vivadis	M04	T07	L132
Vivadis	M04	T07	L133
Vivadis	M04	T08	L134
Vivadis	M04	T08	L135
Vivadis	M04	T08	L136
Vivadis	M04	T08	L137
Vivadis	M04	T09	L138
Vivadis	M04	T09	L139
Vivadis	M04	T09	L140
Vivadis	M04	T09	L141
Vivadis	M04	T10	L142
Vivadis	M04	T10	L143
Vivadis	M04	T10	L144
Vivadis	M04	T10	L145
Vivadis	M05	T01	L1
Vivadis	M05	T01	L2
Vivadis	M05	T01	L3
Vivadis	M05	T01	L4
Vivadis	M05	T02	L5
Vivadis	M05	T02	L6
Vivadis	M05	T02	L7
Vivadis	M05	T02	L8
Vivadis	M05	T03	L9
Vivadis	M05	T03	L10
Vivadis	M05	T03	L11
Vivadis	M05	T03	L12
Vivadis	M05	T04	L13
Vivadis	M05	T04	L14
Vivadis	M05	T04	L15
Vivadis	M05	T04	L16
Vivadis	M05	T05	L17
Vivadis	M05	T05	L18
Vivadis	M05	T05	L19
Vivadis	M05	T05	L20
Vivadis	M05	T06	L21
Vivadis	M05	T06	L22
Vivadis	M05	T06	L23
Vivadis	M05	T06	L24
Vivadis	M05	T07	L25
Vivadis	M05	T07	L26
Vivadis	M05	T07	L27
Vivadis	M05	T07	L28
Vivadis	M05	T08	L29
Vivadis	M05	T08	L30
Vivadis	M05	T08	L31
Vivadis	M05	T08	L32
Vivadis	M05	T09	L33
Vivadis	M05	T09	L34
Vivadis	M05	T10	L35
Vivadis	M05	T10	L36
Vivadis	M05	T09	L37
Vivadis	M05	T09	L38
Vivadis	M05	T10	L39
Vivadis	M05	T10	L40
Vivadis	M05	T09	L41
Vivadis	M05	T11	L42
Vivadis	M05	T11	L43
Vivadis	M05	T11	L44
Vivadis	M05	T11	L45
Vivadis	M05	T12	L46
Vivadis	M05	T12	L47
Vivadis	M05	T12	L48
Santa Teresa	M06	T01	L1
Santa Teresa	M06	T01	L2
Santa Teresa	M06	T02	L3
Santa Teresa	M06	T02	L4
Santa Teresa	M06	T03	L5
Santa Teresa	M06	T03	L6
Santa Teresa	M06	T04	L8
Santa Teresa	M06	T04	L7
Santa Teresa	M06	T05	L9
Santa Teresa	M06	T05	L10
Santa Teresa	M06	T06	L11
Santa Teresa	M06	T06	L12
Santa Teresa	M06	T07	L13
Santa Teresa	M06	T07	L14
Santa Teresa	M06	T07	L15
Santa Teresa	M06	T08	L16
Santa Teresa	M06	T08	L17
Santa Teresa	M06	T09	L18
Santa Teresa	M06	T09	L19
Santa Teresa	M06	T10	L22
Santa Teresa	M06	T10	L23
Santa Teresa	M06	T10	L24
Santa Teresa	M06	T10	L25
Santa Teresa	M06	T11	L20
Santa Teresa	M06	T11	L21
Santa Teresa	M06	T11	L26
Santa Teresa	M06	T11	L27
Santa Teresa	M06	T12	L28
Santa Teresa	M06	T12	L29
Santa Teresa	M06	T12	L30
Santa Teresa	M06	T12	L31
Santa Teresa	M07	T01	L33
Santa Teresa	M07	T01	L34
Santa Teresa	M07	T01	L35
Santa Teresa	M07	T02	L32
Santa Teresa	M07	T02	L36
Santa Teresa	M07	T02	L37
Santa Teresa	M07	T03	L38
Santa Teresa	M07	T03	L39
Santa Teresa	M07	T04	L40
Santa Teresa	M07	T04	L41
Santa Teresa	M07	T05	L42
Santa Teresa	M07	T05	L43
Santa Teresa	M07	T05	L44
Santa Teresa	M07	T06	L45
Santa Teresa	M07	T06	L46
Santa Teresa	M07	T06	L47
Santa Teresa	M07	T07	L48
Santa Teresa	M07	T07	L49
Santa Teresa	M07	T08	L50
Santa Teresa	M07	T08	L51
Santa Teresa	M07	T08	L52
Santa Teresa	M07	T09	L53
Santa Teresa	M07	T09	L54
Santa Teresa	M07	T09	L55
Santa Teresa	M07	T10	L56
Santa Teresa	M07	T10	L57
Santa Teresa	M07	T10	L58
Santa Teresa	M07	T11	L59
Santa Teresa	M07	T11	L60
Santa Teresa	M07	T11	L61
Santa Teresa	M07	T12	L62
Santa Teresa	M07	T12	L63
Santa Teresa	M08	T01	L64
Santa Teresa	M08	T01	L65
Santa Teresa	M08	T01	L66
Santa Teresa	M08	T01	L67
Santa Teresa	M08	T02	L68
Santa Teresa	M08	T02	L69
Santa Teresa	M08	T02	L70
Santa Teresa	M08	T02	L71
Santa Teresa	M08	T03	L72
Santa Teresa	M08	T03	L73
Santa Teresa	M08	T03	L74
Santa Teresa	M08	T04	L75
Santa Teresa	M08	T04	L76
Santa Teresa	M08	T04	L77
Santa Teresa	M08	T04	L78
Santa Teresa	M08	T05	L79
Santa Teresa	M08	T05	L80
Santa Teresa	M08	T06	L81
Santa Teresa	M08	T06	L82
Santa Teresa	M08	T06	L83
Santa Teresa	M08	T07	L84
Santa Teresa	M08	T07	L85
Santa Teresa	M08	T08	L86
Santa Teresa	M08	T08	L87
Santa Teresa	M08	T08	L88
Santa Teresa	M08	T09	L89
Santa Teresa	M08	T09	L90
Santa Teresa	M08	T09	L91
Santa Teresa	M08	T10	L92
Santa Teresa	M08	T10	L93
Santa Teresa	M08	T10	L94
Santa Teresa	M08	T10	L95
Santa Teresa	M08	T11	L96
Santa Teresa	M08	T11	L97
Santa Teresa	M08	T11	L98
Santa Teresa	M08	T12	L99
Santa Teresa	M08	T12	L100
Santa Teresa	M08	T12	L101
Santa Teresa	M08	T12	L102
Santa Teresa	M09	T01	L103
Santa Teresa	M09	T01	L104
Santa Teresa	M09	T01	L105
Santa Teresa	M09	T01	L106
Santa Teresa	M09	T01	L107
Santa Teresa	M09	T02	L108
Santa Teresa	M09	T02	L109
Santa Teresa	M09	T02	L110
Santa Teresa	M09	T02	L111
Santa Teresa	M09	T02	L112
Santa Teresa	M09	T03	L113
Santa Teresa	M09	T03	L114
Santa Teresa	M09	T03	L115
Santa Teresa	M09	T03	L116
Santa Teresa	M09	T03	L117
Santa Teresa	M09	T04	L118
Santa Teresa	M09	T04	L119
Santa Teresa	M09	T04	L120
Santa Teresa	M09	T04	L121
Santa Teresa	M09	T04	L122
Santa Teresa	M09	T05	L123
Santa Teresa	M09	T05	L124
Santa Teresa	M09	T05	L125
Santa Teresa	M09	T05	L126
Santa Teresa	M09	T06	L127
Santa Teresa	M09	T06	L128
Santa Teresa	M09	T06	L129
Santa Teresa	M09	T06	L130
Santa Teresa	M09	T07	L131
Santa Teresa	M09	T07	L132
Santa Teresa	M09	T07	L133
Santa Teresa	M09	T07	L134
Santa Teresa	M09	T08	L135
Santa Teresa	M09	T08	L136
Santa Teresa	M09	T08	L137
Santa Teresa	M09	T08	L138
Santa Teresa	M09	T09	L139
Santa Teresa	M09	T09	L140
Santa Teresa	M09	T09	L141
Santa Teresa	M09	T09	L142
Santa Teresa	M09	T10	L143
Santa Teresa	M09	T10	L144
Santa Teresa	M09	T10	L145
Santa Teresa	M09	T10	L146
Santa Teresa	M09	T11	L147
Santa Teresa	M09	T11	L148
Santa Teresa	M09	T11	L149
Santa Teresa	M09	T11	L150
Santa Teresa	M09	T12	L151
Santa Teresa	M09	T12	L152
Santa Teresa	M09	T12	L153
Santa Teresa	M09	T12	L154
Santa Teresa	M10A	T01	L155
Santa Teresa	M10A	T01	L156
Santa Teresa	M10A	T01	L157
Santa Teresa	M10A	T01	L158
Santa Teresa	M10A	T02	L159
Santa Teresa	M10A	T02	L160
Santa Teresa	M10A	T02	L161
Santa Teresa	M10A	T02	L162
Santa Teresa	M10A	T07	L179
Santa Teresa	M10A	T07	L180
Santa Teresa	M10A	T07	L181
Santa Teresa	M10A	T07	L182
Santa Teresa	M10A	T08	L183
Santa Teresa	M10A	T08	L184
Santa Teresa	M10A	T08	L185
Santa Teresa	M10A	T08	L186
Santa Teresa	M10A	T09	L187
Santa Teresa	M10A	T09	L188
Santa Teresa	M10A	T09	L189
Santa Teresa	M10A	T09	L190
Santa Teresa	M10A	T09	L191
Santa Teresa	M10A	T10	L195
Santa Teresa	M10A	T10	L196
Santa Teresa	M10A	T10	L192
Santa Teresa	M10A	T10	L193
Santa Teresa	M10A	T10	L194
Santa Teresa	M10B	T03	L163
Santa Teresa	M10B	T03	L164
Santa Teresa	M10B	T03	L165
Santa Teresa	M10B	T03	L166
Santa Teresa	M10B	T04	L167
Santa Teresa	M10B	T04	L168
Santa Teresa	M10B	T04	L169
Santa Teresa	M10B	T04	L170
Santa Teresa	M10B	T05	L171
Santa Teresa	M10B	T05	L172
Santa Teresa	M10B	T05	L173
Santa Teresa	M10B	T05	L174
Santa Teresa	M10B	T06	L175
Santa Teresa	M10B	T06	L176
Santa Teresa	M10B	T06	L177
Santa Teresa	M10B	T06	L178
Santa Teresa	M10B	T11	L197
Santa Teresa	M10B	T11	L198
Santa Teresa	M10B	T11	L199
Santa Teresa	M10B	T11	L200
Santa Teresa	M10B	T11	L201
Santa Teresa	M10B	T12	L202
Santa Teresa	M10B	T12	L203
Santa Teresa	M10B	T12	L204
Santa Teresa	M10B	T12	L205
Santa Teresa	M10B	T12	L206
Santa Teresa	M11	T01	L207
Santa Teresa	M11	T01	L208
Santa Teresa	M11	T01	L209
Santa Teresa	M11	T01	L210
Santa Teresa	M11	T02	L211
Santa Teresa	M11	T02	L212
Santa Teresa	M11	T02	L213
Santa Teresa	M11	T02	L214
Santa Teresa	M11	T03	L215
Santa Teresa	M11	T03	L216
Santa Teresa	M11	T03	L217
Santa Teresa	M11	T04	L218
Santa Teresa	M11	T04	L219
Santa Teresa	M11	T04	L220
Santa Teresa	M11	T04	L221
Santa Teresa	M11	T05	L222
Santa Teresa	M11	T05	L223
Santa Teresa	M11	T05	L224
Santa Teresa	M11	T05	L225
Santa Teresa	M11	T06	L226
Santa Teresa	M11	T06	L227
Santa Teresa	M11	T06	L228
Santa Teresa	M11	T07	L229
Santa Teresa	M11	T07	L230
Santa Teresa	M11	T07	L231
Santa Teresa	M11	T07	L232
Santa Teresa	M11	T08	L233
Santa Teresa	M11	T08	L234
Santa Teresa	M11	T08	L235
Santa Teresa	M11	T08	L236
Santa Teresa	M11	T09	L237
Santa Teresa	M11	T09	L238
Santa Teresa	M11	T09	L239
Santa Teresa	M11	T10	L240
Santa Teresa	M11	T10	L241
Santa Teresa	M11	T10	L242
Santa Teresa	M11	T10	L243
Santa Teresa	M11	T11	L244
Santa Teresa	M11	T11	L245
Santa Teresa	M11	T11	L246
Santa Teresa	M11	T11	L247
Santa Teresa	M11	T12	L248
Santa Teresa	M11	T12	L249
Santa Teresa	M11	T12	L250
Ayllu Allpa	M12	T01	L1
Ayllu Allpa	M12	T01	L2
Ayllu Allpa	M12	T01	L3
Ayllu Allpa	M12	T01	L4
Ayllu Allpa	M12	T01	L5
Ayllu Allpa	M12	T02	L6
Ayllu Allpa	M12	T02	L7
Ayllu Allpa	M12	T02	L8
Ayllu Allpa	M12	T02	L9
Ayllu Allpa	M12	T02	L10
Ayllu Allpa	M12	T02	L11
Ayllu Allpa	M12	T02	L12
Ayllu Allpa	M12	T02	L13
Ayllu Allpa	M12	T02	L14
Ayllu Allpa	M12	T03	L15
Ayllu Allpa	M12	T03	L16
Ayllu Allpa	M12	T03	L17
Ayllu Allpa	M12	T03	L18
Ayllu Allpa	M12	T04	L19
Ayllu Allpa	M12	T04	L20
Ayllu Allpa	M12	T04	L21
Ayllu Allpa	M12	T04	L22
Ayllu Allpa	M12	T05	L23
Ayllu Allpa	M12	T05	L24
Ayllu Allpa	M12	T05	L25
Ayllu Allpa	M12	T05	L26
Ayllu Allpa	M12	T05	L27
Ayllu Allpa	M12	T06	L28
Ayllu Allpa	M12	T06	L29
Ayllu Allpa	M12	T06	L30
Ayllu Allpa	M12	T06	L31
Ayllu Allpa	M12	T07	L32
Ayllu Allpa	M12	T07	L33
Ayllu Allpa	M12	T07	L34
Ayllu Allpa	M12	T07	L35
Ayllu Allpa	M12	T08	L36
Ayllu Allpa	M12	T08	L37
Ayllu Allpa	M12	T08	L38
Ayllu Allpa	M12	T08	L40
Ayllu Allpa	M12	T08	L41
Ayllu Allpa	M12	T09	L42
Ayllu Allpa	M12	T09	L43
Ayllu Allpa	M12	T09	L44
Ayllu Allpa	M12	T09	L45
Ayllu Allpa	M12	T10	L46
Ayllu Allpa	M12	T10	L47
Ayllu Allpa	M12	T10	L48
Ayllu Allpa	M12	T10	L49
Ayllu Allpa	M12	T11	L50
Ayllu Allpa	M12	T11	L51
Ayllu Allpa	M12	T11	L52
Ayllu Allpa	M12	T12	L53
Ayllu Allpa	M12	T12	L54
Ayllu Allpa	M13	T01	L55
Ayllu Allpa	M13	T01	L56
Ayllu Allpa	M13	T01	L57
Ayllu Allpa	M13	T01	L58
Ayllu Allpa	M13	T01	L59
Ayllu Allpa	M13	T02	L60
Ayllu Allpa	M13	T02	L61
Ayllu Allpa	M13	T02	L62
Ayllu Allpa	M13	T02	L63
Ayllu Allpa	M13	T03	L64
Ayllu Allpa	M13	T03	L65
Ayllu Allpa	M13	T03	L66
Ayllu Allpa	M13	T03	L67
Ayllu Allpa	M13	T04	L68
Ayllu Allpa	M13	T04	L69
Ayllu Allpa	M13	T04	L70
Ayllu Allpa	M13	T04	L71
Ayllu Allpa	M13	T04	L72
Ayllu Allpa	M13	T04	L73
Ayllu Allpa	M13	T05	L74
Ayllu Allpa	M13	T05	L75
Ayllu Allpa	M13	T05	L76
Ayllu Allpa	M13	T05	L77
Ayllu Allpa	M13	T05	L78
Ayllu Allpa	M13	T05	L79
Ayllu Allpa	M13	T05	L80
Ayllu Allpa	M13	T06	L81
Ayllu Allpa	M13	T06	L82
Ayllu Allpa	M13	T06	L83
Ayllu Allpa	M13	T06	L84
Ayllu Allpa	M13	T07	L85
Ayllu Allpa	M13	T07	L86
Ayllu Allpa	M13	T07	L87
Ayllu Allpa	M13	T07	L88
Ayllu Allpa	M13	T08	L89
Ayllu Allpa	M13	T08	L90
Ayllu Allpa	M13	T08	L91
Ayllu Allpa	M13	T08	L92
Ayllu Allpa	M13	T09	L93
Ayllu Allpa	M13	T09	L94
Ayllu Allpa	M13	T09	L95
Ayllu Allpa	M13	T09	L96
Ayllu Allpa	M13	T10	L97
Ayllu Allpa	M13	T10	L98
Ayllu Allpa	M13	T10	L99
Ayllu Allpa	M13	T10	L100
Ayllu Allpa	M13	T11	L101
Ayllu Allpa	M13	T11	L102
Ayllu Allpa	M13	T11	L103
Ayllu Allpa	M13	T11	L106
Ayllu Allpa	M13	T12	L104
Ayllu Allpa	M13	T12	L105
Ayllu Allpa	M13	T12	L107
Ayllu Allpa	M13	T12	L108
Ayllu Allpa	M13	T12	L109
Ayllu Allpa	M14	T01	L110
Ayllu Allpa	M14	T01	L111
Ayllu Allpa	M14	T01	L113
Ayllu Allpa	M14	T01	L115
Ayllu Allpa	M14	T01	L115B
Ayllu Allpa	M14	T02	L116
Ayllu Allpa	M14	T02	L117
Ayllu Allpa	M14	T02	L118
Ayllu Allpa	M14	T02	L119
Ayllu Allpa	M14	T03	L112
Ayllu Allpa	M14	T03	L114
Ayllu Allpa	M14	T03	L120
Ayllu Allpa	M14	T03	L121
Ayllu Allpa	M14	T04	L122
Ayllu Allpa	M14	T04	L123
Ayllu Allpa	M14	T04	L124
Ayllu Allpa	M14	T04	L125
Ayllu Allpa	M14	T05	L126
Ayllu Allpa	M14	T05	L127
Ayllu Allpa	M14	T05	L128
Ayllu Allpa	M14	T06	L129
Ayllu Allpa	M14	T06	L130
Ayllu Allpa	M14	T06	L131
Ayllu Allpa	M14	T06	L132
Ayllu Allpa	M14	T06	L133
Ayllu Allpa	M14	T07	L134
Ayllu Allpa	M14	T07	L135
Ayllu Allpa	M14	T07	L136
Ayllu Allpa	M14	T07	L137
Ayllu Allpa	M14	T08	L138
Ayllu Allpa	M14	T08	L139
Ayllu Allpa	M14	T08	L140
Ayllu Allpa	M14	T08	L141
Ayllu Allpa	M14	T09	L142
Ayllu Allpa	M14	T09	L143
Ayllu Allpa	M14	T09	L144
Ayllu Allpa	M14	T09	L145
Ayllu Allpa	M14	T10	L146
Ayllu Allpa	M14	T10	L147
Ayllu Allpa	M14	T10	L147B
Ayllu Allpa	M14	T10	L148
Ayllu Allpa	M14	T10	L149
Ayllu Allpa	M14	T10	L150
Ayllu Allpa	M14	T10	L151
Ayllu Allpa	M14	T11	L152
Ayllu Allpa	M14	T11	L153
Ayllu Allpa	M14	T11	L154
Ayllu Allpa	M14	T11	L155
Ayllu Allpa	M14	T12	L156
Ayllu Allpa	M14	T12	L157
Ayllu Allpa	M14	T12	L158
Ayllu Allpa	M14	T12	L159
Ayllu Allpa	M15	T01	L1
Ayllu Allpa	M15	T01	L2
Ayllu Allpa	M15	T01	L3
Ayllu Allpa	M15	T01	L4
Ayllu Allpa	M15	T01	L8
Ayllu Allpa	M15	T01	L1B
Ayllu Allpa	M15	T02	L5
Ayllu Allpa	M15	T02	L6
Ayllu Allpa	M15	T02	L7
Ayllu Allpa	M15	T02	L9
Ayllu Allpa	M15	T02	L10
Ayllu Allpa	M15	T03	L11
Ayllu Allpa	M15	T03	L12
Ayllu Allpa	M15	T03	L13
Ayllu Allpa	M15	T03	L18
Ayllu Allpa	M15	T03	L11B
Ayllu Allpa	M15	T03	L18B
Ayllu Allpa	M15	T04	L19
Ayllu Allpa	M15	T04	L20
Ayllu Allpa	M15	T04	L21
Ayllu Allpa	M15	T04	L22
Ayllu Allpa	M15	T04	L23
Ayllu Allpa	M15	T04	L23B
Ayllu Allpa	M15	T05	L24
Ayllu Allpa	M15	T05	L25
Ayllu Allpa	M15	T05	L26
Ayllu Allpa	M15	T05	L27
Ayllu Allpa	M15	T05	L25B
Ayllu Allpa	M15	T06	L28
Ayllu Allpa	M15	T06	L29
Ayllu Allpa	M15	T06	L30
Ayllu Allpa	M15	T07	L14
Ayllu Allpa	M15	T07	L15
Ayllu Allpa	M15	T07	L16
Ayllu Allpa	M15	T07	L17
Ayllu Allpa	M15	T08	L31
Ayllu Allpa	M15	T08	L32
Ayllu Allpa	M15	T08	L33
Ayllu Allpa	M15	T08	L34
Ayllu Allpa	M15	T09	L35
Ayllu Allpa	M15	T09	L36
Ayllu Allpa	M15	T09	L37
Ayllu Allpa	M15	T10	L38
Ayllu Allpa	M15	T10	L39
Ayllu Allpa	M15	T11	L40
Ayllu Allpa	M15	T11	L41
Ayllu Allpa	M15	T11	L42
Ayllu Allpa	M15	T11	L43
Ayllu Allpa	M15	T12	L44
Ayllu Allpa	M15	T12	L45
Ayllu Allpa	M15	T12	L46
Ayllu Allpa	M15	T12	L47
Ampliacion	M16	T01	L0
Ampliacion	M16	T01	L1
Ampliacion	M16	T01	L2
Ampliacion	M16	T01	L3
Ampliacion	M16	T02	L4
Ampliacion	M16	T02	L5
Ampliacion	M16	T02	L6
Ampliacion	M16	T03	L7
Ampliacion	M16	T03	L8
Ampliacion	M16	T03	L9
Ampliacion	M16	T04	L10
Ampliacion	M16	T04	L11
Ampliacion	M16	T04	L12
Ampliacion	M16	T04	L13
Ampliacion	M16	T05	L14
Ampliacion	M16	T05	L15
Ampliacion	M16	T05	L16
Ampliacion	M16	T06	L17
Ampliacion	M16	T06	L18
Ampliacion	M16	T06	L19
Ampliacion	M16	T07	L20
Ampliacion	M16	T07	L21
Ampliacion	M16	T07	L22
Ampliacion	M16	T07	L23
Ampliacion	M16	T08	L24
Ampliacion	M16	T08	L25
Ampliacion	M16	T08	L26
Ampliacion	M16	T08	L27
Ampliacion	M16	T09	L28
Ampliacion	M16	T09	L29
Ampliacion	M16	T09	L30
Ampliacion	M16	T09	L31
Ampliacion	M16	T10	L32
Ampliacion	M16	T10	L33
Ampliacion	M16	T10	L34
Ampliacion	M16	T10	L35
Ampliacion	M16	T11	L36
Ampliacion	M16	T11	L37
Ampliacion	M16	T11	L38
Ampliacion	M16	T12	L39
Ampliacion	M16	T12	L40
Ampliacion	M16	T12	L41
Ampliacion	M17	T01	L42
Ampliacion	M17	T01	L43
Ampliacion	M17	T01	L44
Ampliacion	M17	T02	L45
Ampliacion	M17	T02	L46
Ampliacion	M17	T03	L47
Ampliacion	M17	T03	L48
Ampliacion	M17	T03	L49
Ampliacion	M17	T04	L50
Ampliacion	M17	T04	L51
Ampliacion	M17	T04	L52
Ampliacion	M17	T05	L53
Ampliacion	M17	T05	L54
Ampliacion	M17	T05	L55
Ampliacion	M17	T06	L56
Ampliacion	M17	T06	L56 B
Ampliacion	M17	T06	L57
Ampliacion	M17	T06	L58
Ampliacion	M17	T07	L59
Ampliacion	M17	T07	L60
Ampliacion	M17	T07	L61
Ampliacion	M17	T08	L62
Ampliacion	M17	T08	L63
Ampliacion	M17	T08	L64
Ampliacion	M17	T09	L65
Ampliacion	M17	T09	L66
Ampliacion	M17	T09	L67
Ampliacion	M17	T10	L68
Ampliacion	M17	T10	L69
Ampliacion	M17	T10	L70
Ampliacion	M17	T11	L71
Ampliacion	M17	T11	L72
Ampliacion	M17	T11	L73
Ampliacion	M17	T12	L74
Ampliacion	M17	T12	L75
Ampliacion	M17	T12	L76
Ampliacion	M18	T01	L77
Ampliacion	M18	T01	L78
Ampliacion	M18	T01	L79
Ampliacion	M18	T01	L80
Ampliacion	M18	T02	L81
Ampliacion	M18	T02	L82
Ampliacion	M18	T02	L83
Ampliacion	M18	T03	L84
Ampliacion	M18	T03	L85
Ampliacion	M18	T03	L86
Ampliacion	M18	T04	L87
Ampliacion	M18	T04	L88
Ampliacion	M18	T04	L89
Ampliacion	M18	T05	L90
Ampliacion	M18	T05	L91
Ampliacion	M18	T05	L92
Ampliacion	M18	T06	L93
Ampliacion	M18	T06	L94
Ampliacion	M18	T06	L95
Ampliacion	M18	T06	L96
Ampliacion	M18	T07	L97
Ampliacion	M18	T07	L98
Ampliacion	M18	T07	L99
Ampliacion	M18	T07	L100
Ampliacion	M18	T07	L101
Ampliacion	M18	T08	L102
Ampliacion	M18	T08	L103
Ampliacion	M18	T09	L104
Ampliacion	M18	T09	L105
Ampliacion	M18	T09	L106
Ampliacion	M18	T09	L107
Ampliacion	M18	T09	L108
Ampliacion	M18	T10	L109
Ampliacion	M18	T10	L110
Ampliacion	M18	T10	L111
Ampliacion	M18	T10	L112
Ampliacion	M18	T11	L113
Ampliacion	M18	T11	L114
Ampliacion	M18	T11	L115
Ampliacion	M18	T11	L116
Ampliacion	M18	T12	L117
Ampliacion	M18	T12	L118
Ampliacion	M18	T12	L119`;

// Parse the raw tab-delimited catalog into strongly-typed LoteItem list
export function parseLotesCatalog(tsvText: string = RAW_LOTES_TSV): LoteItem[] {
  const lines = tsvText.trim().split('\n');
  const items: LoteItem[] = [];
  
  // Skip header line if present
  const startIdx = lines[0].toLowerCase().includes('fundo') ? 1 : 0;
  
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split('\t').map(p => p.trim());
    if (parts.length >= 4) {
      const fundo = parts[0];
      const modulo = parts[1].toUpperCase();
      const turno = parts[2].toUpperCase();
      const lote = parts[3].toUpperCase();
      if (fundo && modulo && turno && lote) {
        items.push({ fundo, modulo, turno, lote });
      }
    }
  }
  return items;
}

export const PARSED_INITIAL_LOTES: LoteItem[] = parseLotesCatalog();
