<template lang="pug">
  .matchups
    .matchups__inner
      h2.page-title
        .page-title__sub Matchups
        .page-title__main What Does NCOL Stand For?
      .matchups-page
        .league-matchups(v-if="weeks")
          ul.weeks
            li.week(v-for="week in weeks")
              h3.title Week {{ week._id }} Matchups
              matchup-previews(:matchups="week.matchups")
</template>

<script>
import axios from 'axios'
import MatchupPreviews from '@/components/MatchupPreviews.vue'

export default {
  name: 'Matchups',
  components: {
    MatchupPreviews
  },
  data() {
    return {
      weeks: []
    }
  },
  async mounted() {
    const result = await axios.get('http://localhost:4444/matchups/')
    this.weeks = result.data
  }
}
</script>

<style lang="scss">
.matchups {
}
.matchups__inner {
}
.matchups-page {
}
</style>
