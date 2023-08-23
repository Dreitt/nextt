import React from 'react'
import Script from 'next/script'
import { YouTubeEmbed as TPCYouTubeEmbed } from 'third-party-capital'

import ThirdPartyScriptEmbed from '../ThirdPartyScriptEmbed'
import { YouTubeEmbed } from '../types/google'

const scriptStrategy = {
  server: 'beforeInteractive',
  client: 'afterInteractive',
  idle: 'lazyOnload',
  worker: 'worker',
}

export default function YouTubeEmbed(props: YouTubeEmbed) {
  const { html, scripts, stylesheets } = TPCYouTubeEmbed(props)

  return (
    <ThirdPartyScriptEmbed
      height={props.height || null}
      width={props.width || null}
      html={html}
      dataNtpc="YoutubeEmbed"
    >
      {scripts?.map((script) => (
        <Script
          src={script.url}
          strategy={scriptStrategy[script.strategy]}
          // @ts-ignore
          stylesheets={stylesheets}
        />
      ))}
    </ThirdPartyScriptEmbed>
  )
}
