<template lang="pug">
  ul.matchup-previews
    li.matchup-preview(v-for="matchup in matchups" :class="{ 'matchup-preview--expanded': expanded }")
      router-link.matchup-preview__link(:to="'/matchup/' + matchup.id")
        .matchup-preview__player.matchup-preview__player--first
          .matchup-preview__photo(:class="'owner-photo--' + matchup.home_owner_ownerid")
          .matchup-preview__name
            .matchup-preview__display-name {{ matchup.home_owner_displayname }}
            .matchup-preview__record {{ matchup.home_owner_wins }}-{{ matchup.home_owner_losses }}
            .matchup-preview__points(v-html="teamFantasyPoints(matchup.homescore)")
        .matchup-preview__vs vs
        .matchup-preview__player.matchup-preview__player--second
          .matchup-preview__photo(:class="'owner-photo--' + matchup.away_owner_ownerid")
          .matchup-preview__name
            .matchup-preview__display-name {{ matchup.away_owner_displayname }}
            .matchup-preview__record {{ matchup.away_owner_wins }}-{{ matchup.away_owner_losses }}
            .matchup-preview__points(v-html="teamFantasyPoints(matchup.awayscore)")
</template>

<script>
import scoreFormatter from '@/utility/scoreFormatter'
export default {
  name: 'MatchupPreviews',
  props: {
    matchups: Array,
    expanded: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    teamFantasyPoints(points) {
      return scoreFormatter(points)
    }
  }
}
</script>

<style lang="scss">
.matchup-preview {
}
.matchup-preview__link {
  background-color: rgba(darken($blue_dark, 5), 0.65);
  border: 1px solid rgba(white, 0.1);
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  color: white;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  padding: 2rem 1.5rem;
  text-decoration: none;
  grid-gap: 1.5rem;
  align-items: center;
  text-align: center;
  transition: all 0.2s ease;
  .matchup-preview--expanded & {
    @media (min-width: 48em) {
      grid-gap: 3rem;
      padding: 2.5rem 2rem;
    }
  }
  &:hover {
    background-color: rgba($blue, 0.15);
    border-color: rgba($blue, 0.15);
    box-shadow: 0 8px 12px rgba(black, 0.8);
    transform: translateY(-0.4rem);
  }
}
.matchup-preview__player {
  .matchup-preview--expanded & {
    @media (min-width: 48em) {
      align-items: center;
      display: grid;
      grid-gap: 2rem;
      grid-template-columns: 8rem 1fr;
      text-align: left;
    }
  }
  .matchup-preview--expanded &.matchup-preview__player--first {
    @media (min-width: 48em) {
      grid-template-columns: 1fr 8rem;
    }
  }
}
.matchup-preview__player--second {
}
.matchup-preview__photo {
  width: 6rem;
  height: 6rem;
  border-radius: 100%;
  margin: 0 auto 1rem;
  background-size: contain;
  .matchup-preview--expanded & {
    @media (min-width: 48em) {
      width: 8rem;
      height: 8rem;
      margin: 0;
    }
  }
  .matchup-preview--expanded .matchup-preview__player--first & {
    @media (min-width: 48em) {
      grid-column: 2;
    }
  }
}
.matchup-preview__name {
  .matchup-preview--expanded .matchup-preview__player--first & {
    @media (min-width: 48em) {
      grid-column: 1;
      grid-row: 1;
      text-align: right;
    }
  }
}
.matchup-preview__display-name {
  .matchup-preview--expanded & {
    @media (min-width: 48em) {
      font-size: 1.8rem;
      padding-bottom: 0.2rem;
      line-height: 1.2;
    }
  }
}
.matchup-preview__record {
  font-size: 1.3rem;
  font-family: $font_ideal;
  font-weight: normal;
  opacity: 0.7;
  .matchup-preview--expanded & {
    @media (min-width: 48em) {
      font-size: 1.4rem;
      padding-bottom: 0.6rem;
    }
  }
}
.matchup-preview__points {
  font-size: 2.4rem;
  color: $blue;
  .matchup-preview--expanded & {
    @media (min-width: 48em) {
      font-size: 3rem;
      line-height: 1;
    }
  }
}
.matchup-preview__vs {
  font-weight: bold;
  color: white;
  opacity: 0.8;
  align-self: stretch;
  padding: 1rem;
  font-size: 2rem;
  border-left: 1px solid rgba(white, 0.2);
  border-right: 1px solid rgba(white, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 300;
  text-transform: uppercase;
}
</style>
