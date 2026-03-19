import { useI18n } from '../../i18n/use_i18n'

export default function ServerError() {
  const { t } = useI18n()

  return (
    <>
      <div className="container">
        <div className="title">Server Error</div>

        <span>{t('error.server.unexpected')}</span>
      </div>
    </>
  )
}
